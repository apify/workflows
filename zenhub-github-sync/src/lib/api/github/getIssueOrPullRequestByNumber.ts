import { getOctokit } from '../../ctx.ts';

const QUERY = /* gql */ `
query GetIssueProjectBoards($repositoryName: String!, $issueNumber: Int!) {
  viewer {
    organization(login: "apify") {
      repository(name: $repositoryName) {
        issueOrPullRequest(number: $issueNumber) {
          __typename
          ... on Issue {
            id
            labels(first: 100) {
              nodes {
                name
                id
              }
            }
          }
          ... on PullRequest {
            id
            labels(first: 100) {
              nodes {
                name
                id
              }
            }
          }
        }
      }
    }
  }
}
`;

export interface GetIssueOrPullRequestByNumberOptions {
	repositoryName: string;
	issueNumber: number;
}

export async function getIssueOrPullRequestByNumber(options: GetIssueOrPullRequestByNumberOptions) {
	const result = await getOctokit().graphql<{
		viewer: {
			organization: {
				repository: {
					issueOrPullRequest: {
						__typename: 'Issue' | 'PullRequest';
						id: string;
						labels: {
							nodes: {
								name: string;
								id: string;
							}[];
						};
					};
				};
			};
		};
	}>(QUERY, {
		repositoryName: options.repositoryName,
		issueNumber: options.issueNumber,
	});

	return {
		issueId: result.viewer.organization.repository.issueOrPullRequest.id,
		labels: result.viewer.organization.repository.issueOrPullRequest.labels.nodes,
	};
}
