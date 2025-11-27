import { getApifyOrgId, getOctokit } from '../../ctx.ts';
import type { GitHubPartialProjectBoard, RawGitHubPartialProjectBoard } from './getProjectBoards.ts';

const CREATE_PROJECT_MUTATION = /* gql */ `
mutation CreateProject($ownerId: ID!, $title: String!, $templateId: ID!) {
	project: copyProjectV2(input: { ownerId: $ownerId, title: $title, projectId: $templateId }) {
		projectV2 {
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
	}
}
`;

const QUERY = /* gql */ `
query ProjectBoardFields($projectId: Int!) {
	organization(login: "apify") {
		projectV2(number: $projectId) {
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
	}
}
`;

export async function cloneFromTemplate(projectName: string): Promise<GitHubPartialProjectBoard> {
	const result = await getOctokit().graphql<{
		project: { projectV2: RawGitHubPartialProjectBoard };
	}>(CREATE_PROJECT_MUTATION, {
		ownerId: getApifyOrgId(),
		// new board name
		title: projectName,
		// TODO: decide if we should instead create a full project from scratch and api calls instead of a template
		// This ID points to this board: https://github.com/orgs/apify/projects/30
		templateId: 'PVT_kwDOAXcoOM4BDwL5',
	});

	// we need to fetch the board after clone to get ALL the fields... -.- thanks GitHub
	const fieldsResult = await getOctokit().graphql<{
		organization: { projectV2: RawGitHubPartialProjectBoard };
	}>(QUERY, {
		projectId: result.project.projectV2.number,
	});

	return {
		id: result.project.projectV2.id,
		number: result.project.projectV2.number,
		title: result.project.projectV2.title,
		closed: result.project.projectV2.closed,
		template: result.project.projectV2.template,
		fields: fieldsResult.organization.projectV2.fields.nodes,
	};
}
