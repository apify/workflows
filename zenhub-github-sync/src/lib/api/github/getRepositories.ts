import { getOctokit } from '../../ctx.ts';

const REPOSITORIES_QUERY = /* gql */ `
query Repositories($cursor: String) {
	viewer {
		organization(login: "apify") {
			repositories(first: 100, after: $cursor) {
				nodes {
					id
					name
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

export interface GitHubPartialRepository {
	id: string;
	name: string;
}

export async function getRepositories() {
	const result = await getOctokit().graphql.paginate<{
		viewer: {
			organization: {
				repositories: {
					nodes: GitHubPartialRepository[];
				};
			};
		};
	}>(REPOSITORIES_QUERY, {
		cursor: null,
	});

	return result.viewer.organization.repositories.nodes;
}
