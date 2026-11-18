/**
 * Owner and name of the repository the workflow runs in (`GITHUB_REPOSITORY` is always set by GitHub Actions).
 * The fallback is only used when running the scripts outside of GitHub Actions.
 */
export function getCurrentRepo() {
    const [owner, name] = (process.env.GITHUB_REPOSITORY || 'apify/apify-core').split('/');

    return { owner, name };
}

/**
 * Key under which the Slack thread of a release PR is stored in the Apify key-value store. The store can be shared by
 * more repositories, so they can use a different `prefix` to avoid clashes of PR numbers.
 *
 * @param {number | string} pullNumber
 * @param {string} [prefix]
 */
export function getSlackThreadRecordKey(pullNumber, prefix = '') {
    return `${prefix}${pullNumber}`;
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} key
 */
export function assertDefined(obj, key) {
    if (!obj || !obj[key]) {
        throw new Error(`${key} must be defined!`);
    }
}

/**
 * @param {string} email
 * @param {string} slackApiToken
 *
 * @returns {Promise<string | null>}
 */
export async function fetchSlackIdByEmail(email, slackApiToken) {
    const slackUserResponse = await fetch(`https://slack.com/api/users.lookupByEmail?email=${email}`, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${slackApiToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!slackUserResponse.ok) {
        /** @type {{ error: string; }} */
        // @ts-expect-error
        const response = await slackUserResponse.json();

        if (response.error === 'ratelimited') {
            // eslint-disable-next-line no-console
            console.error('SLACK: rate limited', {
                retryAfter: slackUserResponse.headers.get('Retry-After'),
            });

            return null;
        }

        throw new Error(`Slack error: ${response.error}`, { cause: slackUserResponse });
    }

    /** @type {any} */
    const slackUserData = await slackUserResponse.json();

    return slackUserData.user?.id ?? null;
}

/**
 * @typedef {{
 *      login: string;
 *      name: string;
 *      organizationVerifiedDomainEmails: string[];
 * }} OrgUser
 */

/** @type {OrgUser[] | null} */
let cachedOrgUsers = null;

/**
 * @param {string} githubToken
 *
 * @returns {Promise<OrgUser[]>}
 */
export async function fetchGithubOrgUsers(githubToken) {
    if (cachedOrgUsers) {
        return cachedOrgUsers;
    }

    const { owner, name } = getCurrentRepo();

    const query = `query GetOrganizationVerifiedEmails($after: String) {
        repository(name: "${name}", owner: "${owner}") {
          collaborators(first: 100, after: $after) {
            edges {
              node {
                login
                name
                organizationVerifiedDomainEmails(login: "${owner}") {}
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
    }`;

    const orgUsers = [];

    let endCursor;
    let hasNextPage;

    do {
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${githubToken}`,
            },
            body: JSON.stringify({
                query,
                variables: {
                    after: endCursor ?? null,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Apify org member emails. Response ${await response.text()}`);
        }

        /** @type {*} */
        const responseBody = await response.json();
        const { edges: collaborators, pageInfo } = responseBody.data.repository.collaborators;

        orgUsers.push(...collaborators);

        ({ hasNextPage, endCursor } = pageInfo);
    } while (hasNextPage);

    const users = orgUsers.map(({ node }) => node);

    cachedOrgUsers = users;

    return users;
}

/**
 * @param {string} email
 * @param {string} githubToken
 *
 * @return {Promise<string | null>}
 */
export async function fetchGithubLoginByEmail(email, githubToken) {
    const users = await fetchGithubOrgUsers(githubToken);

    for (const user of users) {
        if (user.organizationVerifiedDomainEmails.includes(email)) {
            return user.login;
        }
    }

    return null;
}
