import '../lib/setup.ts';

import assert from 'node:assert';
import { readFile, writeFile } from 'node:fs/promises';
import { exit } from 'node:process';

import { confirm } from '@inquirer/prompts';
import { envParseString } from '@skyra/env-utilities';

import type { PipelineIssue } from '../lib/api/zenhub/getPipelineIssuesForRepositories.ts';
import type { Pipeline } from '../lib/config/_shared.ts';
import * as ctx from '../lib/ctx.ts';
import { allowedRepositories } from './server/lib/utils.ts';
import type { EventGap } from './server/routes/_shared.ts';

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
const repositoryNames = allowedRepositories;
const zenhubRepositories = allZenhubRepositories.filter((repo) => repositoryNames.includes(repo.name));

const results = JSON.parse(
	await readFile(new URL('../../results.json', import.meta.url), 'utf8').catch(
		() => '{"pipelines": [], "issues": []}',
	),
) as {
	pipelines: string[];
	issues: string[];
};

async function storeResults() {
	await writeFile(new URL('../../results.json', import.meta.url), JSON.stringify(results, null, 2));
}

const internalWebhookUrl = (() => {
	const urlString = envParseString('INTERNAL_WEBHOOK_URL', null);

	if (!urlString) {
		return null;
	}

	const url = new URL(urlString);

	url.pathname = '/internal/event-cache-queue';

	return url;
})();

for (const pipeline of config.zenhubPipelines) {
	console.log(`Syncing pipeline ${pipeline.name} (${pipeline.id})`);

	const iterator = ctx.zenhub.getPipelineIssuesForRepositoriesIterator({
		pipelineId: pipeline.id,
		repositoryIds: zenhubRepositories.map((repo) => repo.id),
	});

	for await (const data of iterator) {
		for (const issue of data) {
			if (results.issues.includes(`${issue.repository.name}/${issue.number}`)) {
				console.log(`  Issue ${issue.number} for repository ${issue.repository.name} already processed`);
				continue;
			}

			console.log(`  Processing issue ${issue.number} for repository ${issue.repository.name}`);

			try {
				if (internalWebhookUrl) {
					const res = await fetch(internalWebhookUrl, {
						method: 'POST',
						body: JSON.stringify({
							entityId: issue.ghNodeId,
							event: {
								event: 'statusUpdate',
								data: {
									newStatus: pipeline.name,
								},
								timestamp: Date.now(),
							} satisfies EventGap,
						}),
						headers: {
							'Content-Type': 'application/json',
							'User-Agent': 'zenhub-github-sync/internal',
						},
					});

					const text = await res.text();

					if (res.status !== 200) {
						console.error(
							`  Error caching event for issue ${issue.number} for repository ${issue.repository.name}`,
							text,
						);
					} else {
						console.log(
							`  Cached event for issue ${issue.number} for repository ${issue.repository.name}`,
							text,
						);
					}
				}

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
			issueOrPullRequestId: issue.ghNodeId,
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

	await Promise.all(apiCalls.map(async (apiCall) => ctx.github.addIssueOrPullRequestToProjectBoard(apiCall)));
}
