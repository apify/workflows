import { envParseString } from '@skyra/env-utilities';

export * from './getWorkspaceRepositories.ts';
export * from './getWorkspacePipelines.ts';
export * from './getPipelineIssuesForRepositories.ts';

export function getWorkspaceId() {
	return envParseString('ZENHUB_WORKSPACE_ID');
}
