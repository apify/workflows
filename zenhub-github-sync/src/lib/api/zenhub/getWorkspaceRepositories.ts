import { graphqlPaginatedQuery, type GraphQLResponse, type PaginatedResponse } from './_shared.ts';

const QUERY = /* gql */ `
query WorkspaceRepositories($id: ID!, $endCursor: String) {
	workspace(id: $id) {
		name
		repositoriesConnection(after: $endCursor) {
			nodes {
				name
				id
			}
			pageInfo {
				hasNextPage
				endCursor
			}
		}
	}
}
`;

export interface WorkspaceRepository {
	id: string;
	name: string;
}

export type WorkspaceRepositoriesResponse = WorkspaceRepository[];

type RawWorkspaceRepositoriesResponse = GraphQLResponse<{
	workspace: {
		name: string;
		repositoriesConnection: PaginatedResponse<WorkspaceRepository>;
	};
}>;

export async function getWorkspaceRepositories(workspaceId: string): Promise<WorkspaceRepositoriesResponse> {
	const rawResponse = await graphqlPaginatedQuery<RawWorkspaceRepositoriesResponse>(
		QUERY,
		{ id: workspaceId },
		'workspace.repositoriesConnection',
	);

	return rawResponse.data.workspace.repositoriesConnection.nodes;
}
