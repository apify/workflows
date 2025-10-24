import * as ctx from '../../../lib/ctx.ts';
import type { App } from '../app.ts';
import { handledBody } from '../lib/utils.ts';
import { runIfNoSimilarEventHappenedRecently } from './_shared.ts';

type ZenHubWebhookType = 'issue_transfer' | 'estimate_set' | 'estimate_cleared' | 'issue_reprioritized';

interface BaseZenHubWebhookContent<Type extends ZenHubWebhookType> {
	type: Type;
	github_url: string;
	organization: string;
	repo: string;
	user_name: string;
	issue_number: string;
	issue_title: string;
}

interface EstimateSetZenHubWebhookContent extends BaseZenHubWebhookContent<'estimate_set'> {
	// Float-string
	estimate: string;
}

interface IssueTransferZenHubWebhookContent extends BaseZenHubWebhookContent<'issue_transfer'> {
	to_pipeline_name: string;
	workspace_id: string;
	workspace_name: string;
	from_pipeline_name: string;
}

interface IssueReprioritizedZenHubWebhookContent extends BaseZenHubWebhookContent<'issue_reprioritized'> {
	to_pipeline_name: string;
	from_position: string;
	to_position: string;
	workspace_id: string;
	workspace_name: string;
}

export type ZenHubWebhookContent =
	| EstimateSetZenHubWebhookContent
	| IssueTransferZenHubWebhookContent
	| IssueReprioritizedZenHubWebhookContent
	| BaseZenHubWebhookContent<'estimate_cleared'>;

export function registerZenHubRoute(app: App) {
	app.post('/zenhub', async (c) => {
		const body = c.get('rawJsonBody') as unknown as ZenHubWebhookContent;
		const logger = c.get('logger');

		logger.debug('[ZENHUB]', body);

		if (body.organization !== 'apify') {
			return c.json({ error: 'Organization is not Apify' }, 400);
		}

		const { issue_number: issueNumber, repo } = body;

		const { issueId, labels } = await ctx.github.getIssueOrPullRequestByNumber({
			repositoryName: repo,
			issueNumber: Number.parseInt(issueNumber, 10),
		});

		const projectBoardIds = ctx.config.matchers.githubProjectBoardIdsByLabels(
			ctx.getConfig(),
			labels.map((label) => label.name),
		);

		switch (body.type) {
			case 'estimate_set': {
				const estimate = Number.parseFloat(body.estimate);

				await runIfNoSimilarEventHappenedRecently(
					issueId,
					{
						event: 'estimateUpdate',
						data: {
							newEstimate: estimate,
						},
						timestamp: Date.now(),
					},
					async () => {
						await Promise.all(
							projectBoardIds.map(async (projectBoardId) => {
								await ctx.github.addIssueOrPullRequestToProjectBoard({
									issueOrPullRequestId: issueId,
									projectBoardId: projectBoardId.projectId,
									estimateUpdate: {
										fieldId: projectBoardId.estimateFieldId,
										value: estimate,
									},
								});
							}),
						);

						logger.info(
							`Updated estimate for issue ${issueNumber} in project boards ${projectBoardIds.map((projectBoardId) => projectBoardId.projectId).join(', ')}`,
							{ body },
						);
					},
				);

				break;
			}
			case 'estimate_cleared': {
				await runIfNoSimilarEventHappenedRecently(
					issueId,
					{
						event: 'estimateUpdate',
						data: {
							newEstimate: null,
						},
						timestamp: Date.now(),
					},
					async () => {
						await Promise.all(
							projectBoardIds.map(async (projectBoardId) => {
								await ctx.github.addIssueOrPullRequestToProjectBoard({
									issueOrPullRequestId: issueId,
									projectBoardId: projectBoardId.projectId,
									estimateUpdate: {
										fieldId: projectBoardId.estimateFieldId,
										value: null,
									},
								});
							}),
						);

						logger.info(
							`Cleared estimate for issue ${issueNumber} in project boards ${projectBoardIds.map((projectBoardId) => projectBoardId.projectId).join(', ')}`,
							{ body },
						);
					},
				);

				break;
			}
			case 'issue_transfer': {
				if (body.workspace_id !== ctx.zenhub.getWorkspaceId()) {
					logger.info(
						`Skipping issue transfer for issue ${issueNumber} in workspace ${body.workspace_id} (${body.workspace_name}) because it is not the main workspace`,
						{ body },
					);
					break;
				}

				await runIfNoSimilarEventHappenedRecently(
					issueId,
					{
						event: 'statusUpdate',
						data: {
							newStatus: body.to_pipeline_name,
						},
						timestamp: Date.now(),
					},
					async () => {
						await Promise.all(
							projectBoardIds.map(async (projectBoardId) => {
								const statusFieldValue = projectBoardId.statusFieldOptions.find(
									(option) => option.name === body.to_pipeline_name,
								);

								if (!statusFieldValue) {
									logger.error(
										`Status field value not found for pipeline ${body.to_pipeline_name} for project board ${projectBoardId.projectId}`,
										{ body },
									);
									return;
								}

								await ctx.github.addIssueOrPullRequestToProjectBoard({
									issueOrPullRequestId: issueId,
									projectBoardId: projectBoardId.projectId,
									statusUpdate: {
										fieldId: projectBoardId.statusFieldId,
										value: statusFieldValue.id,
									},
								});
							}),
						);

						logger.info(
							`Updated status for issue ${issueNumber} in project boards ${projectBoardIds.map((projectBoardId) => projectBoardId.projectId).join(', ')}`,
							{ body },
						);
					},
				);

				break;
			}
			case 'issue_reprioritized':
				// We don't handle positions because they are positions, and are a mess on GitHub's side
				break;
			default:
				// @ts-expect-error - this is fine
				logger.warning(`Unhandled ZenHub webhook type: ${body.type}`);
				return c.json({ error: `Unhandled ZenHub webhook type` }, 400);
		}

		return handledBody(c);
	});
}
