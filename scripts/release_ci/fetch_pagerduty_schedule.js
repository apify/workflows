import { assertDefined, fetchSlackIdByEmail, fetchGithubLoginByEmail } from './common.js';

/**
 * Fetches the current on-duty user's email from a PagerDuty schedule and their Slack and Github logins.
 *
 * @param {{
 *    core: import('@actions/core'),
 *    pagerDutyApiKey: string,
 *    scheduleId: string,
 *    slackApiToken: string,
 *    githubToken: string,
 * }} opts
 *
 * @returns {Promise<{ email: string, slackId: string | null, githubLogin: string | null } | null>}
 */
export async function fetchPagerDutyScheduleUser(opts) {
    assertDefined(opts, 'core');
    assertDefined(opts, 'pagerDutyApiKey');
    assertDefined(opts, 'scheduleId');
    assertDefined(opts, 'slackApiToken');
    assertDefined(opts, 'githubToken');

    const { core, pagerDutyApiKey, scheduleId, slackApiToken, githubToken } = opts;

    // Fetch the current on-duty user from the PagerDuty schedule.
    const todayDutyTime = new Date();

    // Schedule changes at 10:00 AM Prague time, so let's check the duty for today at 13,
    // that should cover all UTC +- DST issues. May the earth be light on Stanislav Pecka.
    todayDutyTime.setHours(13, 0, 0, 0);

    const dateSince = todayDutyTime.toISOString();
    const dateUntil = new Date(todayDutyTime.getTime() + 60000).toISOString();

    const scheduleUsersResponse = await fetch(
        `https://api.pagerduty.com/schedules/${scheduleId}/users?since=${dateSince}&until=${dateUntil}`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Token token=${pagerDutyApiKey}`,
                'Content-Type': 'application/json',
            },
        },
    );

    /** @type any */
    const scheduleUsersData = await scheduleUsersResponse.json();
    if (!scheduleUsersData.users?.length) {
        core.warning(`No users on duty found for schedule ${scheduleId}. ${JSON.stringify(scheduleUsersData)}`);
        return null;
    }

    const { email } = scheduleUsersData.users[0];

    const [slackId, githubLogin] = await Promise.all([
        fetchSlackIdByEmail(email, slackApiToken),
        fetchGithubLoginByEmail(email, githubToken),
    ]);

    return {
        email,
        slackId,
        githubLogin,
    };
}
