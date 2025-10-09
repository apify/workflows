import { graphqlQuery, type GraphQLResponse, type PaginatedResponse } from './_shared.ts';

const QUERY = /* gql */ `
query workspacePipelines($workspaceId: ID!) {
  workspace(id: $workspaceId) {
    id
    pipelinesConnection {
      nodes {
        id
        name
        description
      }
    }
  }
}
`;

export interface WorkspacePipeline {
	id: string;
	name: string;
	description: string;
}

export type WorkspacePipelinesResponse = WorkspacePipeline[];

type RawWorkspacePipelinesResponse = GraphQLResponse<{
	workspace: {
		id: string;
		pipelinesConnection: PaginatedResponse<WorkspacePipeline>;
	};
}>;

export async function getWorkspacePipelines(workspaceId: string) {
	const rawResponse = await graphqlQuery<RawWorkspacePipelinesResponse>(QUERY, { workspaceId: workspaceId });

	return rawResponse.data.workspace.pipelinesConnection.nodes;
}
