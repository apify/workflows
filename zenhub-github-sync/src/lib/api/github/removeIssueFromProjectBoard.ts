import { getOctokit } from '../../ctx.ts';

const MUTATION_REMOVE_ISSUE_FROM_BOARD = /* gql */ `
mutation RemoveIssueFromBoard($projectBoardId: ID!, $itemId: ID!) {
  removeFromBoard: deleteProjectV2Item(
    input: {projectId: $projectBoardId, itemId: $itemId}
  ) {
    deletedItemId
  }
}
`;

export interface RemoveIssueFromProjectBoardOptions {
	projectBoardId: string;
	itemId: string;
}

export async function removeIssueFromProjectBoard(options: RemoveIssueFromProjectBoardOptions) {
	await getOctokit().graphql(MUTATION_REMOVE_ISSUE_FROM_BOARD, {
		projectBoardId: options.projectBoardId,
		itemId: options.itemId,
	});
}
