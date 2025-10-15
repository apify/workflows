import assert from 'node:assert';

import { type BooleanString, envParseString, type IntegerString } from '@skyra/env-utilities';
import { Octokit } from 'octokit';

import type { Config } from './config/_shared.ts';
import { parseConfig } from './config/deserializer.ts';
import { debugLog } from './utils.ts';

export * as github from './api/github/_exports.ts';
export * as zenhub from './api/zenhub/_exports.ts';
export * as config from './config/_exports.ts';
export * as prompts from './prompts/_exports.ts';

let octokit: Octokit | null = null;
let apifyOrgId: string | null = null;
let config: Config | null = null;

export function getOctokit(): Octokit {
	assert(octokit, 'Octokit instance is not initialized');

	return octokit;
}

export function getApifyOrgId() {
	assert(apifyOrgId, 'Apify organization ID is not initialized');

	return apifyOrgId;
}

export function getConfig(): Config {
	assert(config, 'Config is not initialized');

	return config;
}

export async function setup() {
	if (envParseString('GITHUB_TOKEN') === 'PLEASE_SET_ME_IN_.env.local') {
		throw new Error('Please create a .env.local file and set the GITHUB_TOKEN variable.');
	}

	if (envParseString('ZENHUB_TOKEN') === 'PLEASE_SET_ME_IN_.env.local') {
		throw new Error('Please create a .env.local file and set the ZENHUB_TOKEN variable.');
	}

	// create octokit instance
	octokit = new Octokit({
		auth: envParseString('GITHUB_TOKEN'),
		userAgent: 'ApifyWorkflows ZenHub-GitHub (https://github.com/apify/workflows)',
	});

	const me = await octokit.rest.users.getAuthenticated();

	debugLog('Who am I:', me.data.login, me.data.name);

	const coreInfo = await octokit.rest.repos
		.get({
			owner: 'apify',
			repo: 'apify-core',
		})
		.catch(() => null);

	if (!coreInfo) {
		throw new Error('The provided GitHub token lacks access to private repositories in the Apify organization!');
	}

	apifyOrgId = coreInfo.data.owner.node_id;

	debugLog('Apify organization ID:', apifyOrgId);

	config = await parseConfig();
}

declare module '@skyra/env-utilities' {
	interface Env {
		GITHUB_TOKEN: string;
		ZENHUB_TOKEN: string;
		ZENHUB_WORKSPACE_ID: string;

		DEBUG: BooleanString;

		ACTOR_WEB_SERVER_PORT?: IntegerString;
	}
}
