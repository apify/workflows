import { graphqlQuery, type GraphQLResponse } from './_shared.ts';

const MUTATION = /* gql */ `
mutation SetIssuePipeline($pipelineId: ID!, $issueId: ID!) {
  moveIssue(input: {pipelineId: $pipelineId, issueId: $issueId}) {
    pipeline {
      name
    }
  }
}
`;

export interface SetIssuePipelineOptions {
	issueId: string;
	pipelineId: string;
}

type RawSetIssuePipelineResponse = GraphQLResponse<{
	moveIssue: {
		pipeline: {
			name: string;
		};
	};
}>;

export async function setIssuePipeline(options: SetIssuePipelineOptions) {
	await graphqlQuery<RawSetIssuePipelineResponse>(MUTATION, {
		pipelineId: options.pipelineId,
		issueId: options.issueId,
	});
}
