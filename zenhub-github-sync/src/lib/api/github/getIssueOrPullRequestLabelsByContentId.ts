import { getOctokit } from '../../ctx.ts';

const QUERY = /* gql */ `
query GetIssueOrPulLRequestLabelsByContentId($nodeId: ID!) {
  node(id: $nodeId) {
    __typename
    ... on Issue {
      number
      repository {
        name
        databaseId
      }
      labels(first: 100) {
        nodes {
          name
        }
      }
    }
    ... on PullRequest {
      number
      repository {
        name
        databaseId
      }
      labels(first: 100) {
        nodes {
          name
        }
      }
    }
  }
}
`;

export interface GetIssueOrPullRequestLabelsByContentIdOptions {
	contentId: string;
}

export async function getIssueOrPullRequestLabelsByContentId(options: GetIssueOrPullRequestLabelsByContentIdOptions) {
	const result = await getOctokit().graphql<{
		node: {
			__typename: 'Issue' | 'PullRequest';
			number: number;
			repository: {
				name: string;
				databaseId: number;
			};
			labels: {
				nodes: {
					name: string;
					id: string;
				}[];
			};
		};
	}>(QUERY, {
		nodeId: options.contentId,
	});

	return {
		__typename: result.node.__typename,
		number: result.node.number,
		repository: result.node.repository,
		labels: result.node.labels.nodes,
	};
}
