import { graphqlQuery, type GraphQLResponse } from './_shared.ts';

const MUTATION = /* gql */ `
mutation SetIssuePipeline($issueId: ID!, $estimate: Float) {
  setEstimate(input: {issueId: $issueId, value: $estimate}) {
    issue {
      id
    }
  }
}
`;

export interface SetIssueEstimateOptions {
	issueId: string;
	estimate: number | null;
}

type RawSetIssueEstimateResponse = GraphQLResponse<{
	setEstimate: {
		issue: {
			id: string;
		};
	};
}>;

export async function setIssueEstimate(options: SetIssueEstimateOptions) {
	await graphqlQuery<RawSetIssueEstimateResponse>(MUTATION, {
		issueId: options.issueId,
		estimate: options.estimate,
	});
}
