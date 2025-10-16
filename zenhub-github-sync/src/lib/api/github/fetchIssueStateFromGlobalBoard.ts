import { getConfig, getOctokit } from '../../ctx.ts';
import { addIssueToProjectBoard } from './addIssueToProjectBoard.ts';

const QUERY = /* gql */ `
query GetIssueProjectBoards($nodeId: ID!) {
  node(id: $nodeId) {
    __typename
    ... on ProjectV2Item {
      __typename
# 		Why the hell can we not use a field ID, BUT THE NAME???
      status: fieldValueByName(name: "Status") {
        __typename
        ... on ProjectV2ItemFieldSingleSelectValue {
          name
        }
      }
      estimate: fieldValueByName(name: "Estimate") {
        __typename
        ... on ProjectV2ItemFieldNumberValue {
          number
        }
      }
    }
  }
}
`;

export interface FetchIssueStateFromGlobalBoardIdOptions {
	repositoryName: string;
	issueId: string;
}

export interface IssueState {
	status: string;
	estimate: number | null;
}

export async function fetchIssueStateFromGlobalBoard(
	options: FetchIssueStateFromGlobalBoardIdOptions,
): Promise<IssueState> {
	const { githubBoardId } = getConfig().globalBoard!;

	// Thanks GitHub...
	const { projectItemId } = await addIssueToProjectBoard({
		issueId: options.issueId,
		projectBoardId: githubBoardId,
	});

	const { node } = await getOctokit().graphql<{
		node: {
			status: {
				__typename: 'ProjectV2ItemFieldSingleSelectValue';
				name: string;
			} | null;
			estimate: {
				__typename: 'ProjectV2ItemFieldNumberValue';
				number: number;
			} | null;
		};
	}>(QUERY, { nodeId: projectItemId });

	return {
		status: node.status?.name ?? 'New Issues',
		estimate: node.estimate?.number ?? null,
	};
}
