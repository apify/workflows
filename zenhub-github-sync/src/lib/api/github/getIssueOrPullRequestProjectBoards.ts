import { getOctokit } from '../../ctx.ts';
import { addIssueOrPullRequestToProjectBoard } from './addIssueOrPullRequestToProjectBoard.ts';

const QUERY_ISSUE_PROJECT_BOARDS = /* gql */ `
query GetIssueProjectBoards($repositoryName: String!, $issueNumber: Int!) {
  viewer {
    organization(login: "apify") {
      repository(name: $repositoryName) {
        issueOrPullRequest(number: $issueNumber) {
          __typename
          ... on Issue {
            projectsV2(first: 100) {
              nodes {
                title
                id
              }
            }
          }
          ... on PullRequest {
            projectsV2(first: 100) {
              nodes {
                title
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

export interface GetIssueOrPullRequestProjectBoardsOptions {
	repositoryName: string;
	issueOrPullRequestNumber: number;
	issueOrPullRequestId: string;
}

export interface IssueProjectBoard {
	projectBoardId: string;
	projectBoardTitle: string;
	projectItemId: string;
}

export async function getIssueProjectBoards(
	options: GetIssueOrPullRequestProjectBoardsOptions,
): Promise<IssueProjectBoard[]> {
	const result = await getOctokit().graphql<{
		viewer: {
			organization: {
				repository: {
					issueOrPullRequest: {
						__typename: 'Issue' | 'PullRequest';
						projectsV2: {
							nodes: {
								id: string;
								title: string;
							}[];
						};
					};
				};
			};
		};
	}>(QUERY_ISSUE_PROJECT_BOARDS, {
		repositoryName: options.repositoryName,
		issueNumber: options.issueOrPullRequestNumber,
	});

	return await Promise.all(
		result.viewer.organization.repository.issueOrPullRequest.projectsV2.nodes.map(async (projectBoardId) => {
			const itemId = await addIssueOrPullRequestToProjectBoard({
				issueOrPullRequestId: options.issueOrPullRequestId,
				projectBoardId: projectBoardId.id,
			});

			return {
				projectBoardId: projectBoardId.id,
				projectBoardTitle: projectBoardId.title,
				projectItemId: itemId.projectItemId,
			} satisfies IssueProjectBoard;
		}),
	);
}
