import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentsRunUrl } from './fetch_currents_run.js';

const core = { warning: vi.fn() };
/** @type {any} */
const opts = { core, currentsApiKey: 'key', projectId: 'T3im2d', ciBuildId: 'reporter-apify/apify-core-123-1' };

/** @param {any} response */
const mockFetch = (response) => {
    // @ts-ignore - a partial Response is enough for these tests
    global.fetch = vi.fn(async () => response);
};

describe('fetchCurrentsRunUrl', () => {
    const fetchBackup = fetch;
    afterEach(() => {
        global.fetch = fetchBackup;
        vi.clearAllMocks();
    });

    it('returns the run URL when the run is found', async () => {
        mockFetch({ ok: true, json: () => Promise.resolve({ data: { runId: 'e3c2bc2eccd8e2e4' } }) });

        const url = await fetchCurrentsRunUrl(opts);

        expect(url).toBe('https://app.currents.dev/run/e3c2bc2eccd8e2e4');
        expect(core.warning).not.toHaveBeenCalled();
    });

    it('requests the run by project and build ID with the auth and gzip headers', async () => {
        mockFetch({ ok: true, json: () => Promise.resolve({ data: { runId: 'e3c2bc2eccd8e2e4' } }) });

        await fetchCurrentsRunUrl(opts);

        expect(fetch).toHaveBeenCalledWith(
            'https://api.currents.dev/v1/runs/find?projectId=T3im2d&ciBuildId=reporter-apify%2Fapify-core-123-1',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    Authorization: 'Bearer key',
                    'Accept-Encoding': 'gzip',
                }),
            }),
        );
    });

    it('returns null and warns when no run is found', async () => {
        mockFetch({ ok: true, json: () => Promise.resolve({ data: null }) });

        const url = await fetchCurrentsRunUrl(opts);

        expect(url).toBeNull();
        expect(core.warning).toHaveBeenCalled();
    });

    it('returns null and warns when the request fails', async () => {
        mockFetch({ ok: false, status: 404 });

        const url = await fetchCurrentsRunUrl(opts);

        expect(url).toBeNull();
        expect(core.warning).toHaveBeenCalled();
    });

    it('returns null and warns when the request throws', async () => {
        // @ts-ignore - simulate a network-level failure
        global.fetch = vi.fn(() => Promise.reject(new TypeError('fetch failed')));

        const url = await fetchCurrentsRunUrl(opts);

        expect(url).toBeNull();
        expect(core.warning).toHaveBeenCalled();
    });

    it('returns null and warns when the response body is not valid JSON', async () => {
        mockFetch({ ok: true, json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')) });

        const url = await fetchCurrentsRunUrl(opts);

        expect(url).toBeNull();
        expect(core.warning).toHaveBeenCalled();
    });

    it('returns null and warns without calling the API when required options are missing', async () => {
        mockFetch({ ok: true, json: () => Promise.resolve({ data: { runId: 'e3c2bc2eccd8e2e4' } }) });

        const url = await fetchCurrentsRunUrl({ ...opts, currentsApiKey: '' });

        expect(url).toBeNull();
        expect(core.warning).toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });
});
