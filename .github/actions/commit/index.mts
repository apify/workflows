import * as util from 'node:util';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs/promises';

import type { Octokit } from '@octokit/rest';
import type * as Core from '@actions/core';

const exec = util.promisify(childProcess.exec);

export const FILE_STATUS = { ADDED: 'A', DELETED: 'D', MODIFIED: 'M' };

type FileChanges = {
    additions: { path: string; contents: string; }[];
    deletions: { path: string; }[];
};

export async function main({ github, env, core }: { github: Octokit, env: Record<string, string>, core: typeof Core }) {
    const {
        COMMIT_MESSAGE,
        REPO,
        EXPECTED_HEAD_OID,
        BRANCH,
    } = env;

    const fileChanges: FileChanges = { additions: [], deletions: [] };
    const stagedFiles = await status();

    for (const [status, path] of stagedFiles) {
        switch (status) {
            case FILE_STATUS.ADDED:
            case FILE_STATUS.MODIFIED:
                fileChanges.additions.push({
                    path,
                    contents: await fs.readFile(path, { encoding: 'base64' }),
                });

                break;

            case FILE_STATUS.DELETED:
                fileChanges.deletions.push({ path });
                break;

            default:
                throw new Error(`unexpected file status "${status}"`);
        }
    }

    // Only log file paths not the base64 encoded file contents.
    const changedPaths = {
        additions: fileChanges.additions.map(({ path }) => path),
        deletions: fileChanges.deletions.map(({ path }) => path),
    };
    core.info(`committing file changes: "${JSON.stringify(changedPaths, null, 4)}"`);

    const commitMessageLines = COMMIT_MESSAGE.split('\n');
    const messageTitle = commitMessageLines[0];
    const messageBody = commitMessageLines.slice(1).join('\n').trim();

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
                branchName: BRANCH,
                repositoryNameWithOwner: REPO,
            },
            expectedHeadOid: EXPECTED_HEAD_OID,
            message: {
                headline: messageTitle,
                body: messageBody,
            },
        },
    }) as any;

    const commitSha = response.createCommitOnBranch.commit.oid;
    core.info(`successfully pushed commit "${commitSha}"`);

    core.setOutput('commit-sha', commitSha);
}

/**
 * Produces the list of staged files for committing in the format: `Array<[status, path]>`
 */
export async function status(): Promise<Readonly<[string, string]>[]> {
    const cmd = [
        'git',
        'diff-index',
        '--cached',      // only from the staging area (added files)
        '--name-status', // show file name and status (from FILE_STATUS)
        '--no-renames',  // do not track file renames (copy/move) - we only need added / removed
        'HEAD',
    ];

    const stagedFileStatuses = (await exec(cmd.join(' '), { encoding: 'utf8' })).stdout.trim();

    return stagedFileStatuses.split('\n')
        .map((line) => {
            // The file path can contain spaces. We should only split by
            // the first occurrence of a white space character.
            const columnDelimiter = line.search(/\s+/);
            if (columnDelimiter === -1) {
                return null;
            }

            const status = line.slice(0, columnDelimiter);
            const path = line.slice(columnDelimiter + 1);

            if (!status || !path) {
                return null;
            }

            return [status, path] as const;
        })
        .filter((it) => !!it);
}
