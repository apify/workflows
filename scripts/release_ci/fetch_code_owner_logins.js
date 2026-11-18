import { assertDefined, getCurrentRepo } from './common.js';

/**
 * https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/iam-configuration-reference/username-considerations-for-external-authentication#about-username-normalization
 * Usernames for user accounts on GitHub can only contain alphanumeric characters and dashes (-).
 */
/** Locations where GitHub looks for CODEOWNERS, in order of precedence. */
const CODEOWNERS_PATHS = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'];

const GITHUB_LOGIN_REGEX = /@([\w-_]+)/g;

/**
 * Fetches the CODEOWNERS file of the current repository from the current PR
 * and parses out and returns the logins of the users defined in CODEOWNERS.
 * The file is looked up in the locations supported by GitHub, in the same order of precedence.
 *
 * @param {{
 *      githubToken: string,
 *      pullNumber: number,
 * }} opts
 *
 * @returns {Promise<Set<string>>}
 */
export async function fetchCodeOwnerLogins(opts) {
    assertDefined(opts, 'githubToken');
    assertDefined(opts, 'pullNumber');

    const { githubToken, pullNumber } = opts;

    const { owner, name } = getCurrentRepo();

    let codeownersFile;
    let lastError = 'no location tried';

    for (const path of CODEOWNERS_PATHS) {
        const response = await fetch(
            `https://raw.githubusercontent.com/${owner}/${name}/refs/pull/${pullNumber}/head/${path}`,
            {
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                },
            },
        );

        if (response.ok) {
            codeownersFile = await response.text();
            break;
        }

        lastError = `${path}: ${JSON.stringify(await response.text())}`;
    }

    if (codeownersFile === undefined) {
        throw new Error(`Failed to fetch CODEOWNERS file (last error - ${lastError})`);
    }

    // ignore usernames mentioned in commented-out lines
    codeownersFile = codeownersFile
        .split('\n')
        .filter((line) => !line.startsWith('#'))
        .join('\n');

    const logins = new Set();
    let result;
    // eslint-disable-next-line no-cond-assign
    while ((result = GITHUB_LOGIN_REGEX.exec(codeownersFile)) !== null) {
        logins.add(result[1]);
    }

    return logins;
}
