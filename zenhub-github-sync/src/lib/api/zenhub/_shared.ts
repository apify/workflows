import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';

import { envParseString } from '@skyra/env-utilities';
import mpath from 'mpath';

const { get: mget } = mpath;

export interface GraphQLResponse<T> {
	data: T;
}

export interface PageInfo {
	hasNextPage: boolean;
	endCursor: string;
}

export interface PaginatedResponse<T> {
	nodes: T[];
	pageInfo: PageInfo;
}

const BASE_URL = 'https://api.zenhub.com/public/graphql';

export async function graphqlQuery<T extends GraphQLResponse<unknown>>(
	query: string,
	variables: Record<string, unknown>,
): Promise<T> {
	const res = await fetch(BASE_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'ApifyWorkflows ZenHub-GitHub (https://github.com/apify/workflows)',
			'Authorization': `Bearer ${envParseString('ZENHUB_TOKEN')}`,
		},
		body: JSON.stringify({ query, variables }),
	});

	// Basic rate limiting handling
	if (res.status === 429) {
		const retryAfter = res.headers.get('Retry-After');

		if (retryAfter) {
			const waitTime = Number(retryAfter) * 1000;

			if (Number.isNaN(waitTime)) {
				throw new Error(`Failed to fetch ZenHub API: ${res.statusText}`, { cause: await res.text() });
			}

			await setTimeout(waitTime, null, { ref: false });

			return graphqlQuery<T>(query, variables);
		}
	}

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Failed to fetch ZenHub API: ${res.statusText}`, { cause: body });
	}

	const body = (await res.json()) as any;

	if ('errors' in body) {
		throw new Error(`Failed to fetch ZenHub API: ${body.errors.map((error: any) => error.message).join(', ')}`, {
			cause: body,
		});
	}

	return body as T;
}

/**
 * @param query The GraphQL query to fetch the data. It must include a parameter named $endCursor of type String.
 * @param pathToNodesConnection The path in the data object to the nodes connection object (the object containing a nodes array and a pageInfo object)
 */
export async function* graphqlPaginatedQueryIterator<T extends GraphQLResponse<unknown>>(
	query: string,
	variables: Record<string, unknown>,
	pathToNodesConnection: string,
): AsyncGenerator<T> {
	assert(query.includes('$endCursor'), 'Query must include a parameter named $endCursor of type String');
	assert(query.includes('pageInfo'), 'Query must include a fragment that returns a pageInfo object for pagination');

	const originalData = await graphqlQuery<T>(query, variables);

	yield originalData;

	const fullKey = `data.${pathToNodesConnection}`;

	const nodesObject = mget(fullKey, originalData) as PaginatedResponse<unknown>;

	if (!nodesObject) {
		throw new Error(`Path ${pathToNodesConnection} not found in the data object`, { cause: originalData });
	}

	if (!nodesObject.pageInfo?.hasNextPage) {
		return;
	}

	let { pageInfo } = nodesObject;

	while (pageInfo.hasNextPage) {
		variables['endCursor'] = pageInfo.endCursor;
		const newData = await graphqlQuery<T>(query, variables);

		const newNodesObject = mget(fullKey, newData) as PaginatedResponse<unknown>;

		if (!newNodesObject) {
			throw new Error(`Path ${pathToNodesConnection} not found in the data object`, { cause: newData });
		}

		pageInfo = newNodesObject.pageInfo;

		yield newData;
	}
}

export async function graphqlPaginatedQuery<T extends GraphQLResponse<unknown>>(
	query: string,
	variables: Record<string, unknown>,
	pathToNodesConnection: string,
): Promise<T> {
	const iterator = graphqlPaginatedQueryIterator<T>(query, variables, pathToNodesConnection);

	const result = await iterator.next();

	if (result.done) {
		return result.value;
	}

	const returnData = result.value;

	const fullKey = `data.${pathToNodesConnection}`;

	const nodesObject = mget(fullKey, returnData) as PaginatedResponse<unknown>;

	for await (const data of iterator) {
		const newNodesObject = mget(fullKey, data) as PaginatedResponse<unknown>;

		if (!newNodesObject) {
			throw new Error(`Path ${pathToNodesConnection} not found in the data object`, { cause: data });
		}

		nodesObject.nodes.push(...newNodesObject.nodes);
	}

	return returnData;
}
