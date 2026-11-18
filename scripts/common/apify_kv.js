// Minimal Apify key-value store record helpers shared across CI scripts (release_ci, argos_ci).
// Kept domain-agnostic so neither area has to import from the other.

const APIFY_KV_BASE = 'https://api.apify.com/v2/key-value-stores';

/**
 * Read a record from an Apify key-value store. Returns its text body, or null if absent.
 * @param {{ apifyApiToken: string, apifyStoreId: string, key: string }} opts
 * @returns {Promise<string | null>}
 */
export async function apifyKvGetRecord({ apifyApiToken, apifyStoreId, key }) {
    const response = await fetch(`${APIFY_KV_BASE}/${apifyStoreId}/records/${key}`, {
        headers: { Authorization: `Bearer ${apifyApiToken}` },
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Apify KV get failed: ${await response.text()}`, { cause: response });
    }

    return await response.text();
}

/**
 * Write a record to an Apify key-value store.
 * @param {{ apifyApiToken: string, apifyStoreId: string, key: string, value: string }} opts
 */
export async function apifyKvSetRecord({ apifyApiToken, apifyStoreId, key, value }) {
    const response = await fetch(`${APIFY_KV_BASE}/${apifyStoreId}/records/${key}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${apifyApiToken}`, 'Content-Type': 'text/plain' },
        body: value,
    });

    if (!response.ok) {
        throw new Error(`Apify KV set failed: ${await response.text()}`, { cause: response });
    }
}

/**
 * Delete a record from an Apify key-value store (a missing record is not an error).
 * @param {{ apifyApiToken: string, apifyStoreId: string, key: string }} opts
 */
export async function apifyKvDeleteRecord({ apifyApiToken, apifyStoreId, key }) {
    const response = await fetch(`${APIFY_KV_BASE}/${apifyStoreId}/records/${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apifyApiToken}` },
    });

    if (!response.ok && response.status !== 404) {
        throw new Error(`Apify KV delete failed: ${await response.text()}`, { cause: response });
    }
}
