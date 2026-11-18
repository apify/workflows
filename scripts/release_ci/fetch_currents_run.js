/**
 * Resolves the Currents dashboard URL of a specific run by its CI build ID, so that the release
 * Slack message can link straight to this release's Playwright run instead of the project home.
 *
 * @param {{
 *    core: import('@actions/core'),
 *    currentsApiKey: string,
 *    projectId: string,
 *    ciBuildId: string,
 * }} opts
 *
 * @returns {Promise<string | null>} The run URL, or null if it could not be resolved.
 */
export async function fetchCurrentsRunUrl({ core, currentsApiKey, projectId, ciBuildId }) {
    if (!currentsApiKey || !projectId || !ciBuildId) {
        core.warning('Cannot fetch Currents run: missing currentsApiKey, projectId, or ciBuildId.');
        return null;
    }

    const searchParams = new URLSearchParams({ projectId, ciBuildId });
    let response;
    try {
        response = await fetch(`https://api.currents.dev/v1/runs/find?${searchParams.toString()}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                // The /runs/find response includes every spec and is capped at 1MB; gzip keeps large release runs under it.
                'Accept-Encoding': 'gzip',
                Authorization: `Bearer ${currentsApiKey}`,
            },
        });
    } catch (error) {
        core.warning(`Failed to fetch Currents run for ciBuildId ${ciBuildId}. ${String(error)}`);
        return null;
    }

    if (!response.ok) {
        core.warning(`Failed to fetch Currents run for ciBuildId ${ciBuildId} (status ${response.status}).`);
        return null;
    }

    let data;
    try {
        data = /** @type {{ data?: { runId?: string } }} */ (await response.json());
    } catch (error) {
        core.warning(`Failed to parse Currents run response for ciBuildId ${ciBuildId}. ${String(error)}`);
        return null;
    }

    const runId = data?.data?.runId;

    if (typeof runId !== 'string' || !runId) {
        core.warning(`No Currents run found for ciBuildId ${ciBuildId}.`);
        return null;
    }

    return `https://app.currents.dev/run/${encodeURIComponent(runId)}`;
}
