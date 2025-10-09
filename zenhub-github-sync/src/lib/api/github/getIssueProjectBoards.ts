import { getOctokit } from '../../ctx.ts';
import { addIssueToProjectBoard } from './addIssueToProjectBoard.ts';

const QUERY_ISSUE_PROJECT_BOARDS = /* gql */ `
query GetIssueProjectBoards($repositoryName: String!, $issueNumber: Int!) {
	viewer {
		organization(login: "apify") {
			repository(name: $repositoryName) {
				issue(number: $issueNumber) {
					projectsV2(first: 100) {
						nodes {
							id
							title
						}
					}
				}
			}
		}
	}
}`;

export interface GetIssueProjectBoardsOptions {
	repositoryName: string;
	issueNumber: number;
	issueId: string;
}

export interface IssueProjectBoard {
	projectBoardId: string;
	projectBoardTitle: string;
	projectItemId: string;
}

export async function getIssueProjectBoards(options: GetIssueProjectBoardsOptions): Promise<IssueProjectBoard[]> {
	const result = await getOctokit().graphql<{
		viewer: {
			organization: {
				repository: {
					issue: {
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
		issueNumber: options.issueNumber,
	});

	return await Promise.all(
		result.viewer.organization.repository.issue.projectsV2.nodes.map(async (projectBoardId) => {
			const itemId = await addIssueToProjectBoard({
				issueId: options.issueId,
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
