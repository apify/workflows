import { graphqlQuery, type GraphQLResponse } from './_shared.ts';

const QUERY = /* gql */ `
query GetIssueInfoByNumber($repositoryGitHubId: Int!, $issueNumber: Int!) {
  issueByInfo(repositoryGhId: $repositoryGitHubId, issueNumber: $issueNumber) {
    id
    title
  }
}
`;

export interface GetIssueInfoByNumberOptions {
	repositoryGitHubNumber: number;
	issueNumber: number;
}

type RawIssueInfoResponse = GraphQLResponse<{
	issueByInfo: {
		id: string;
		title: string;
	};
}>;

export async function getIssueInfoByNumber(options: GetIssueInfoByNumberOptions) {
	const result = await graphqlQuery<RawIssueInfoResponse>(QUERY, {
		repositoryGitHubId: options.repositoryGitHubNumber,
		issueNumber: options.issueNumber,
	});

	return result.data.issueByInfo;
}
