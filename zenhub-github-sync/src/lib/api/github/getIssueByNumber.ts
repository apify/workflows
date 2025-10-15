import { getOctokit } from '../../ctx.ts';

const QUERY = /* gql */ `
query GetIssueProjectBoards($repositoryName: String!, $issueNumber: Int!) {
  viewer {
    organization(login: "apify") {
      repository(name: $repositoryName) {
        issue(number: $issueNumber) {
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
`;

export interface GetIssueByNumberOptions {
	repositoryName: string;
	issueNumber: number;
}

export async function getIssueByNumber(options: GetIssueByNumberOptions) {
	const result = await getOctokit().graphql<{
		viewer: {
			organization: {
				repository: {
					issue: {
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
		issueId: result.viewer.organization.repository.issue.id,
		labels: result.viewer.organization.repository.issue.labels.nodes,
	};
}
