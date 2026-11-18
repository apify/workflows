import { apifyKvGetRecord } from '../common/apify_kv.js';
import { assertDefined } from './common.js';

/**
 * @param {{
 *      apifyApiToken: string,
 *      apifyStoreId: string,
 *      apifyRecordKey: string,
 * }} opts
 *
 * @returns {Promise<string | null>}
 */
export async function fetchSlackReleaseThreadId(opts) {
    assertDefined(opts, 'apifyApiToken');
    assertDefined(opts, 'apifyStoreId');
    assertDefined(opts, 'apifyRecordKey');

    const { apifyApiToken, apifyStoreId, apifyRecordKey } = opts;

    return apifyKvGetRecord({ apifyApiToken, apifyStoreId, key: apifyRecordKey });
}
