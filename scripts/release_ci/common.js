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

    const query = `query GetOrganizationVerifiedEmails($after: String) {
        repository(name: "apify-core", owner: "apify") {
          collaborators(first: 100, after: $after) {
            edges {
              node {
                login
                name
                organizationVerifiedDomainEmails(login: "apify") {}
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
