import { log } from 'apify';
import { LRUCache } from 'lru-cache';

import { getOctokit } from '../../ctx.ts';

const MUTATION_STEP_ADD_TO_BOARD = /* gql */ `
mutation AddIssueToBoard($projectBoardId: ID!, $issueOrPRId: ID!) {
  addToBoard: addProjectV2ItemById(
    input: {projectId: $projectBoardId, contentId: $issueOrPRId}
  ) {
    item {
      id
    }
  }
}
`;

type CacheKey = `${string}:${string}`;

const cacheOfIssueOrPullRequestIdToProjectItemId = new LRUCache<CacheKey, string>({
	// Cache a maximum of 10_000 items
	max: 10_000,
	// Cache for 1 minute
	ttl: 60 * 1000,
	updateAgeOnGet: false,
	allowStale: false,
});

export function evictIssueOrPullRequestProjectItemId(projectBoardId: string, issueOrPullRequestId: string) {
	cacheOfIssueOrPullRequestIdToProjectItemId.delete(`${projectBoardId}:${issueOrPullRequestId}`);

	log.info('Evicted issue or pull request project item ID from cache', {
		projectBoardId,
		issueOrPullRequestId,
	});
}

export async function getIssueOrPullRequestProjectItemId(
	projectBoardId: string,
	issueOrPullRequestId: string,
): Promise<string> {
	const cached = cacheOfIssueOrPullRequestIdToProjectItemId.get(`${projectBoardId}:${issueOrPullRequestId}`);

	if (cached) {
		log.debug('[ITEM ID CACHE] Cache hit for issue or pull request project item ID', {
			projectBoardId,
			issueOrPullRequestId,
			projectItemId: cached,
		});

		return cached;
	}

	const {
		addToBoard: {
			item: { id: projectItemId },
		},
	} = await getOctokit().graphql<{
		addToBoard: {
			item: {
				id: string;
			};
		};
	}>(MUTATION_STEP_ADD_TO_BOARD, {
		projectBoardId,
		issueOrPRId: issueOrPullRequestId,
	});

	log.info('Cache miss for issue or pull request project item ID', {
		projectBoardId,
		issueOrPullRequestId,
		projectItemId,
	});

	cacheOfIssueOrPullRequestIdToProjectItemId.set(`${projectBoardId}:${issueOrPullRequestId}`, projectItemId);

	return projectItemId;
}
