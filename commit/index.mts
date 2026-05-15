import * as util from 'node:util';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs/promises';

import type { Octokit } from '@octokit/rest';
import type * as Core from '@actions/core';

const exec = util.promisify(childProcess.exec);

// The other statuses are ignored:
//   C: should not be produced, as we're using --no-renames,
//   R: same as C,
//   T: file type change (symlink, git submodule) -> this cannot be committed through the API,
//   U: merge conflict,
//   X: unknown - git bug.
export const FILE_STATUS = { ADDED: 'A', DELETED: 'D', MODIFIED: 'M' } as const;

type FileChanges = {
    additions: { path: string; contents: string; }[];
    deletions: { path: string; }[];
};

type GitFileStatus = {
    // octal numbers
    modeBefore: number;
    modeAfter: number;

    shaBefore: string;
    shaAfter: string;
    fileStatus: string;
    filePath: string;
};

const MODE_RW = 0o100644;

/**
 * Since the GitHub API only supports committing file contents, there is no way to specify executable files.
 * This function checks whether the staging area contains only files with valid (rw-r--r--) mode.
 *
 * NOTE: git does not store the actual POSIX file modes. It only stores an executable flag. (for regular files)
 */
export function checkSupportedFileModes(status: GitFileStatus) {
    if (status.fileStatus === FILE_STATUS.ADDED && status.modeAfter !== MODE_RW) {
        throw new Error(`Detected unsupported file mode "${status.modeAfter.toString(8)}": "${status.filePath}". The GitHub API does not provide a way to define custom file modes.`);
    }

    if (status.fileStatus === FILE_STATUS.MODIFIED && status.modeBefore !== status.modeAfter) {
        throw new Error(`Detected file mode change "${status.modeBefore.toString(8)}" -> "${status.modeAfter.toString(8)}": "${status.filePath}". The GitHub API does not provide a way to define custom file modes.`);
    }
}

/**
 * Produces the list of staged files for committing.
 */
export async function status(options: Omit<childProcess.ExecOptions, 'encoding'> = {}): Promise<GitFileStatus[]> {
    const cmd = [
        'git',
        'diff-index',
        '--cached',      // only from the staging area (added files)
        '--no-renames',  // do not track file renames (copy/move) - we only need added / removed
        'HEAD',
    ];

    const stagedFileStatuses = (await exec(cmd.join(' '), { encoding: 'utf8', ...options })).stdout.trim();

    // see: man git-diff-index(1) - section RAW OUTPUT FORMAT
    return stagedFileStatuses.split('\n')
        .map((line) => {
            const tabSplit = line.split('\t');
            if (tabSplit.length !== 2) {
                return null;
            }

            const [info, filePath] = tabSplit;
            const [modeBefore, modeAfter, shaBefore, shaAfter, fileStatus] = info.split(' ');

            return {
                modeBefore: parseInt(modeBefore.slice(1), 8),
                modeAfter: parseInt(modeAfter, 8),
                shaBefore,
                shaAfter,
                fileStatus,
                filePath,
            };
        })
        .filter((it) => !!it);
}

async function collectFileChanges(): Promise<FileChanges> {
    const fileChanges: FileChanges = { additions: [], deletions: [] };
    const stagedFiles = await status();

    for (const file of stagedFiles) {
        checkSupportedFileModes(file);
        const { filePath, fileStatus } = file;

        switch (fileStatus) {
            case FILE_STATUS.ADDED:
            case FILE_STATUS.MODIFIED:
                fileChanges.additions.push({
                    path: filePath,
                    contents: await fs.readFile(filePath, { encoding: 'base64' }),
                });

                break;

            case FILE_STATUS.DELETED:
                fileChanges.deletions.push({ path: filePath });
                break;

            default:
                throw new Error(`unexpected file status "${fileStatus}"`);
        }
    }

    return fileChanges;
}

const RETRY_BASE_DELAY_MS = 1000;

type CreateCommitArgs = {
    github: Octokit;
    repo: string;
    branch: string;
    expectedHeadOid: string;
    messageTitle: string;
    messageBody: string;
    fileChanges: FileChanges;
};

async function createCommit({ github, repo, branch, expectedHeadOid, messageTitle, messageBody, fileChanges }: CreateCommitArgs): Promise<string> {
    const response = await github.graphql(`\
        mutation Commit($input: CreateCommitOnBranchInput!) {
            createCommitOnBranch(input: $input) {
                commit {
                    oid
                }
            }
        }
    `, {
        input: {
            fileChanges,
            branch: {
                branchName: branch,
                repositoryNameWithOwner: repo,
            },
            expectedHeadOid,
            message: {
                headline: messageTitle,
                body: messageBody,
            },
        },
    }) as any;

    return response.createCommitOnBranch.commit.oid;
}

export async function main({ github, env, core }: { github: Octokit, env: Record<string, string>, core: typeof Core }) {
    const {
        COMMIT_MESSAGE,
        REPO,
        BRANCH,
        PULL = '',
        RETRIES = '0',
    } = env;

    const retries = parseInt(RETRIES, 10);
    if (Number.isNaN(retries) || retries < 0) {
        throw new Error(`'retries' must be a non-negative integer, got "${RETRIES}"`);
    }
    if (retries > 0 && PULL === '') {
        throw new Error(`'retries' is set to ${retries} but 'pull' is empty — retrying requires 'pull' to be set so the action can fetch the new HEAD between attempts.`);
    }

    const commitMessageLines = COMMIT_MESSAGE.split('\n');
    const messageTitle = commitMessageLines[0];
    const messageBody = commitMessageLines.slice(1).join('\n').trim();

    const maxAttempts = retries + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (PULL !== '') {
            const pullCmd = PULL === 'true' ? 'git pull' : `git pull ${PULL}`;
            core.info(`Executing "${pullCmd}" before committing (attempt ${attempt}/${maxAttempts})`);
            await exec(pullCmd, { encoding: 'utf8' });
        }

        const expectedHeadOid = (await exec('git rev-parse HEAD', { encoding: 'utf8' })).stdout.trim();
        const fileChanges = await collectFileChanges();

        // Only log file paths not the base64 encoded file contents.
        const changedPaths = {
            additions: fileChanges.additions.map(({ path }) => path),
            deletions: fileChanges.deletions.map(({ path }) => path),
        };
        core.info(`committing file changes: "${JSON.stringify(changedPaths, null, 4)}"`);

        if (fileChanges.additions.length === 0 && fileChanges.deletions.length === 0) {
            core.info('no staged changes — skipping commit');
            core.setOutput('committed', 'false');
            core.setOutput('commit_sha', expectedHeadOid.slice(0, 7));
            core.setOutput('commit_long_sha', expectedHeadOid);
            return;
        }

        try {
            const commitSha = await createCommit({
                github,
                repo: REPO,
                branch: BRANCH,
                expectedHeadOid,
                messageTitle,
                messageBody,
                fileChanges,
            });
            core.info(`successfully pushed commit "${commitSha}"`);

            core.setOutput('commit_sha', commitSha.slice(0, 7));
            core.setOutput('commit_long_sha', commitSha);
            core.setOutput('committed', 'true');
            return;
        } catch (err) {
            if (attempt < maxAttempts) {
                const delayMs = RETRY_BASE_DELAY_MS * (2 ** (attempt - 1));
                core.warning(`commit attempt ${attempt}/${maxAttempts} failed: ${err instanceof Error ? err.message : String(err)} — retrying in ${delayMs}ms`);
                await new Promise((resolve) => { setTimeout(resolve, delayMs); });
                continue;
            }
            throw err;
        }
    }
}
