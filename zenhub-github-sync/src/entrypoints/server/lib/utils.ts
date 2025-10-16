import type { Context } from 'hono';

export function handledBody(c: Context) {
	return c.json({ handled: true });
}

export const allowedRepositories = [
	'apify-actor-docker',
	'apify-cli',
	'apify-client-js',
	'apify-client-python',
	'apify-eslint-config',
	'apify-sdk-js',
	'apify-sdk-python',
	'apify-shared-js',
	'apify-shared-python',
	'apify-tsconfig',
	'camoufox-js',
	'crawlee',
	'crawlee-python',
	'fingerprint-suite',
	'got-scraping',
	'impit',
	'store-website-content-crawler',
	'workflows',

	// test repo
	'vlad-zenhub-github-test',
];
