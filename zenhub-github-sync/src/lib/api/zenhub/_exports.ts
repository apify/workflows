import { envParseString } from '@skyra/env-utilities';

export * from './getWorkspaceRepositories.ts';
export * from './getWorkspacePipelines.ts';
export * from './getPipelineIssuesForRepositories.ts';
export * from './getIssueInfo.ts';
export * from './setIssuePipeline.ts';
export * from './setIssueEstimate.ts';

export function getWorkspaceId() {
	return envParseString('ZENHUB_WORKSPACE_ID');
}
