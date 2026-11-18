import { assertDefined } from './common.js';

/**
 * https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/iam-configuration-reference/username-considerations-for-external-authentication#about-username-normalization
 * Usernames for user accounts on GitHub can only contain alphanumeric characters and dashes (-).
 */
const GITHUB_LOGIN_REGEX = /@([\w-_]+)/g;

/**
 * Fetches the CODEOWNERS file from `apify/apify-core` repository from the current PR
 * and parses out and returns the logins of the users defined in CODEOWNERS.
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

    const response = await fetch(
        `https://raw.githubusercontent.com/apify/apify-core/refs/pull/${pullNumber}/head/CODEOWNERS`,
        {
            headers: {
                Authorization: `Bearer ${githubToken}`,
            },
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch CODEOWNERS file: ${JSON.stringify(await response.text())}`);
    }

    let codeownersFile = await response.text();

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
