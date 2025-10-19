import { getOctokit } from '../../ctx.ts';
import { getIssueOrPullRequestProjectItemId } from './_shared.ts';

const MUTATION_STEP_UPDATE_STATUS = /* gql */ `
mutation SetStatusForIssue($projectBoardId: ID!, $projectItemId: ID!, $statusFieldId: ID!, $statusFieldOptionId: String!) {
  setStatus: updateProjectV2ItemFieldValue(
    input: {projectId: $projectBoardId, itemId: $projectItemId, fieldId: $statusFieldId, value: {singleSelectOptionId: $statusFieldOptionId}}
  ) {
    projectV2Item {
      id
    }
  }
}
`;

const MUTATION_STEP_UPDATE_ESTIMATE = /* gql */ `
mutation SetEstimateForIssue($projectBoardId: ID!, $projectItemId: ID!, $estimateFieldId: ID!, $estimateValue: Float) {
  setEstimate: updateProjectV2ItemFieldValue(
    input: {projectId: $projectBoardId, itemId: $projectItemId, fieldId: $estimateFieldId, value: {number: $estimateValue}}
  ) {
    projectV2Item {
      id
    }
  }
}
`;

export interface GitHubAPICall {
	projectBoardId: string;
	issueId: string;
	statusUpdate?: {
		fieldId: string;
		value: string;
	};
	estimateUpdate?: {
		fieldId: string;
		value: number | null;
	};
}

export interface AddIssueToProjectBoardResult {
	projectItemId: string;
}

export async function addIssueToProjectBoard(apiCall: GitHubAPICall): Promise<AddIssueToProjectBoardResult> {
	const issueProjectItemId = await getIssueOrPullRequestProjectItemId(apiCall.projectBoardId, apiCall.issueId);

	const promises: Promise<void>[] = [];

	if (apiCall.statusUpdate) {
		promises.push(
			getOctokit().graphql(MUTATION_STEP_UPDATE_STATUS, {
				projectBoardId: apiCall.projectBoardId,
				projectItemId: issueProjectItemId,
				statusFieldId: apiCall.statusUpdate.fieldId,
				statusFieldOptionId: apiCall.statusUpdate.value,
			}),
		);
	}

	if (apiCall.estimateUpdate) {
		promises.push(
			getOctokit().graphql(MUTATION_STEP_UPDATE_ESTIMATE, {
				projectBoardId: apiCall.projectBoardId,
				projectItemId: issueProjectItemId,
				estimateFieldId: apiCall.estimateUpdate.fieldId,
				estimateValue: apiCall.estimateUpdate.value,
			}),
		);
	}

	await Promise.all(promises);

	return {
		projectItemId: issueProjectItemId,
	};
}
