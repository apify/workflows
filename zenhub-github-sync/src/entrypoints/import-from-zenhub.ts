import '../lib/setup.ts';

import * as ctx from '../lib/ctx.ts';
import assert from 'node:assert';
import { confirm } from '@inquirer/prompts';
import { exit } from 'node:process';
import type { PipelineIssue } from '../lib/api/zenhub/getPipelineIssuesForRepositories.ts';
import type { Pipeline } from '../lib/config/_shared.ts';
import { writeFile } from 'node:fs/promises';

console.log(
	'By running this script, everything from ZenHub will be imported to GitHub, based on the configuration file, overwriting anything that was changed on the GitHub project boards!',
);

const confirm1 = await confirm({
	message: 'Are you sure you want to continue?',
	default: false,
});

if (!confirm1) {
	exit(0);
}

const config = await ctx.config.parseConfig();
assert(config.globalBoard, 'Global board is not set');

const allZenhubRepositories = await ctx.zenhub.getWorkspaceRepositories(ctx.zenhub.getWorkspaceId());
const repositoryNames = [
	//
	'apify-actor-docker',
	'apify-cli',
	'apify-client-js',
	'apify-client-python',
	'apify-eslint-config',
	'apify-sdk-js',
	'apify-sdk-python',
	'apify-shared-js',
	'apify-shared-python',
	'apify-tsconfig',
	'camoufox-js',
	'crawlee',
	'crawlee-python',
	'fingerprint-suite',
	'got-scraping',
	'impit',
	'store-website-content-crawler',
	'workflows',
];
const zenhubRepositories = allZenhubRepositories.filter((repo) => repositoryNames.includes(repo.name));

const results = {
	pipelines: [],
	issues: [],
} as {
	pipelines: string[];
	issues: string[];
};

async function storeResults() {
	await writeFile(new URL('../../results.json', import.meta.url), JSON.stringify(results, null, 2));
}

for (const pipeline of config.zenhubPipelines) {
	console.log(`Syncing pipeline ${pipeline.name} (${pipeline.id})`);

	const iterator = ctx.zenhub.getPipelineIssuesForRepositoriesIterator({
		pipelineId: pipeline.id,
		repositoryIds: zenhubRepositories.map((repo) => repo.id),
	});

	for await (const data of iterator) {
		for (const issue of data) {
			console.log(`  Processing issue ${issue.number} for repository ${issue.repository.name}`);

			try {
				await addIssueToProjectBoards(issue, pipeline);
			} catch (error) {
				console.error(
					`  Error processing issue ${issue.number} for repository ${issue.repository.name}`,
					error,
				);
			}

			results.issues.push(`${issue.repository.name}/${issue.number}`);

			await storeResults();

			console.log(`  Done processing issue ${issue.number} for repository ${issue.repository.name}`);
		}
	}

	results.pipelines.push(pipeline.name);

	console.log(`Done syncing pipeline ${pipeline.name}`);
}

async function addIssueToProjectBoards(issue: PipelineIssue, pipeline: Pipeline) {
	const projectBoardIds = ctx.config.matchers.githubProjectBoardIdsByLabels(
		config,
		issue.metadata.labels.map((label) => label.name),
	);

	const apiCalls: ctx.github.GitHubAPICall[] = [];

	for (const projectBoardId of projectBoardIds) {
		const apiCall: ctx.github.GitHubAPICall = {
			projectBoardId: projectBoardId.projectId,
			issueId: issue.ghNodeId,
		};

		apiCall.statusUpdate = {
			fieldId: projectBoardId.statusFieldId,
			value: projectBoardId.statusFieldOptions.find((option) => option.name === pipeline.name)!.id,
		};

		if (issue.metadata.estimate) {
			apiCall.estimateUpdate = {
				fieldId: projectBoardId.estimateFieldId,
				value: issue.metadata.estimate.value,
			};
		}

		apiCalls.push(apiCall);
	}

	await Promise.all(apiCalls.map((apiCall) => ctx.github.addIssueToProjectBoard(apiCall)));
}
