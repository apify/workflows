import * as ctx from '../../ctx.ts';
import { graphqlPaginatedQueryIterator, type GraphQLResponse } from './_shared.ts';

const QUERY = /* gql */ `
query pipelineIssues($pipelineId: ID!, $workspaceId: ID!, $endCursor: String, $filters: IssueSearchFiltersInput!) {
  searchIssuesByPipeline(
    pipelineId: $pipelineId
    filters: $filters
    after: $endCursor
    first: 100
    order: {field: created_at, direction: ASC}
  ) {
    pageInfo {
      endCursor
      startCursor
      hasNextPage
      __typename
    }
    nodes {
      __typename
      id
      number
      ghNodeId
      title
      state
      htmlUrl
      type
      metadata(workspaceId: $workspaceId)
      repository {
        name
        id
		ghNodeId
      }
    }
    __typename
  }
}
`;

export interface GetPipelineIssuesForRepositoriesOptions {
	pipelineId: string;
	repositoryIds: string[];
}

export interface ZenHubGitHubPartialUser {
	html_url: string;
	id: string;
	gh_id: number;
	avatar_url: string;
	login: string;
	name: string;
}

export interface ZenHubGitHubPartialLabel {
	id: string;
	color: string;
	gh_id: number;
	name: string;
}

export interface PipelineGitHubIssueMetadata {
	type: 'GithubIssue';
	repository: {
		id: string;
		gh_id: number;
		name: string;
		owner: Record<string, unknown>;
	};
	user: ZenHubGitHubPartialUser;
	creator: Record<string, unknown> | null;
	issue_type: string | null;
	assignees: ZenHubGitHubPartialUser[];
	estimate: {
		value: number;
	} | null;
	estimation_state: string | null;
	labels: ZenHubGitHubPartialLabel[];
	zenhub_labels: [];
	sprints: [];
	predicted_sprint: string | null;
	pipeline_issue: {
		id: string;
		relative_position: number;
		pipeline: {
			id: string;
		};
		priority: string | null;
		latest_transfer_time: {
			started_at: string;
		};
	};
	pull_request_data: {
		state: string;
		draft: boolean;
	} | null;
	pull_request_reviews: [];
	review_requests: [];
	connected_to_issue: {
		exists: boolean;
	};
	pr_connections: [];
	parent_epics: [];
	parent_zenhub_epics: [];
	epic: string | null;
	blocking: [];
	blocked_by: [];
	releases: [];
	milestone: string | null;
}

type PipelineMetadata = PipelineGitHubIssueMetadata;

export interface PipelineIssue {
	__typename: string;
	/**
	 * ZenHub ID
	 */
	id: string;
	ghNodeId: string;
	number: number;
	title: string;
	state: string;
	htmlUrl: string;
	type: string;
	metadata: PipelineMetadata;
	repository: {
		name: string;
		id: string;
		ghNodeId: string;
	};
}

type RawPipelineIssuesResponse = GraphQLResponse<{
	searchIssuesByPipeline: {
		nodes: PipelineIssue[];
	};
}>;

export async function* getPipelineIssuesForRepositoriesIterator({
	pipelineId,
	repositoryIds,
}: GetPipelineIssuesForRepositoriesOptions) {
	const filter = {
		matchType: 'all',
		'issueIssueTypeDisposition': 'BOARD',
		repositoryIds: repositoryIds,
	};

	const workspaceId = ctx.zenhub.getWorkspaceId();

	const iterator = graphqlPaginatedQueryIterator<RawPipelineIssuesResponse>(
		QUERY,
		{ pipelineId, workspaceId, filters: filter },
		'searchIssuesByPipeline',
	);

	for await (const data of iterator) {
		yield data.data.searchIssuesByPipeline.nodes;
	}
}

export async function getPipelineIssuesForRepositories(options: GetPipelineIssuesForRepositoriesOptions) {
	const iterator = getPipelineIssuesForRepositoriesIterator(options);

	const issues: PipelineIssue[] = [];

	for await (const data of iterator) {
		issues.push(...data);
	}

	return Object.groupBy(issues, (issue) => issue.repository.id);
}
