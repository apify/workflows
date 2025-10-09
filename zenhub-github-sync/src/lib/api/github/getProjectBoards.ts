import { getOctokit } from '../../ctx.ts';

const PROJECT_BOARDS_QUERY = /* gql */ `
query ProjectBoards($cursor: String) {
	viewer {
		organization(login: "apify") {
			projectsV2(first: 100, after: $cursor) {
				nodes {
					id
					number
					title
					closed
					template
					fields(first: 100) {
						nodes {
							__typename
							... on ProjectV2Field {
								id
								name
								dataType
							}
							... on ProjectV2SingleSelectField {
								id
								name
								dataType
								options {
									id
									name
								}
							}
						}
					}
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}
	}
}
`;

export const GitHubProjectBoardFieldType = {
	Normal: 'ProjectV2Field',
	SingleSelect: 'ProjectV2SingleSelectField',
} as const;

export type GitHubProjectBoardFieldType =
	(typeof GitHubProjectBoardFieldType)[keyof typeof GitHubProjectBoardFieldType];

export interface GitHubProjectBoardFieldBase<T extends GitHubProjectBoardFieldType> {
	__typename: T;
	id: string;
	name: string;
	dataType:
		| 'ASSIGNEES'
		| 'DATE'
		| 'ISSUE_TYPE'
		| 'ITERATION'
		| 'LABELS'
		| 'LINKED_PULL_REQUESTS'
		| 'MILESTONE'
		| 'NUMBER'
		| 'PARENT_ISSUE'
		| 'REPOSITORY'
		| 'REVIEWERS'
		| 'SINGLE_SELECT'
		| 'SUB_ISSUES_PROGRESS'
		| 'TEXT'
		| 'TITLE'
		| 'TRACKED_BY'
		| 'TRACKS';
}

export interface GitHubProjectBoardSingleSelectField
	extends GitHubProjectBoardFieldBase<typeof GitHubProjectBoardFieldType.SingleSelect> {
	options: {
		id: string;
		name: string;
	}[];
}

export type GitHubProjectBoardGenericField = GitHubProjectBoardFieldBase<typeof GitHubProjectBoardFieldType.Normal>;

export type GitHubProjectBoardField = GitHubProjectBoardGenericField | GitHubProjectBoardSingleSelectField;

export interface GitHubPartialProjectBoard {
	id: string;
	title: string;
	number: number;
	closed: boolean;
	template: boolean;
	fields: GitHubProjectBoardField[];
}

export interface RawGitHubPartialProjectBoard {
	id: string;
	number: number;
	title: string;
	closed: boolean;
	template: boolean;
	fields: {
		nodes: GitHubProjectBoardField[];
	};
}

export async function getProjectBoards(): Promise<GitHubPartialProjectBoard[]> {
	const result = await getOctokit().graphql.paginate<{
		viewer: {
			organization: {
				projectsV2: {
					nodes: RawGitHubPartialProjectBoard[];
				};
			};
		};
	}>(PROJECT_BOARDS_QUERY, {
		cursor: null,
	});

	return result.viewer.organization.projectsV2.nodes
		.filter((project) => !project.closed && !project.template)
		.map((project) => ({
			id: project.id,
			title: project.title,
			number: project.number,
			closed: project.closed,
			template: project.template,
			fields: project.fields.nodes,
		}));
}
