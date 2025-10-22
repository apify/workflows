import type {
	IssuesEvent,
	ProjectsV2ItemEditedEvent,
	ProjectsV2ItemEvent,
	PullRequestEvent,
	Repository,
	WebhookEventName,
} from '@octokit/webhooks-types';
import { envParseString } from '@skyra/env-utilities';
import type { Log } from 'apify';

import type { GetIssueOrPullRequestByNumberResult } from '../../../lib/api/github/getIssueOrPullRequestByNumber.ts';
import type { ZenHubIssue } from '../../../lib/api/zenhub/getIssueInfo.ts';
import type { GitHubProjectBoard } from '../../../lib/config/matchers.ts';
import * as ctx from '../../../lib/ctx.ts';
import type { App, AppContext } from '../app.ts';
import { StatusFieldNames, StatusFieldValues } from '../lib/consts.ts';
import { allowedRepositories, handledBody } from '../lib/utils.ts';
import { addEventGap, runIfNoSimilarEventHappenedRecently } from './_shared.ts';

type ListenedEvent = IssuesEvent | PullRequestEvent | ProjectsV2ItemEvent;

function hasRepository(body: ListenedEvent): body is Extract<ListenedEvent, { repository: { name: string } }> {
	return 'repository' in body;
}

function isIssuesEvent(event: WebhookEventName, body: ListenedEvent): body is IssuesEvent {
	return event === 'issues' && 'action' in body;
}

function isPullRequestEvent(event: WebhookEventName, body: ListenedEvent): body is PullRequestEvent {
	return event === 'pull_request' && 'action' in body;
}

function isProjectsV2ItemEvent(event: WebhookEventName, body: ListenedEvent): body is ProjectsV2ItemEvent {
	return event === 'projects_v2_item' && 'action' in body;
}

const textEncoder = new TextEncoder();

function hexToBytes(hex: string) {
	const len = hex.length / 2;
	const bytes = new Uint8Array(len);

	let index = 0;
	for (let i = 0; i < hex.length; i += 2) {
		const c = hex.slice(i, i + 2);
		const b = parseInt(c, 16);
		bytes[index] = b;
		index += 1;
	}

	return bytes;
}

async function handleOpenedIssueOrPullRequest({
	logger,
	repository,
	issueOrPullRequest,
	zenhubIssue,
	boardsTheIssueShouldBeIn,
}: {
	logger: Log;
	repository: Repository;
	issueOrPullRequest: GetIssueOrPullRequestByNumberResult;
	zenhubIssue: ZenHubIssue;
	boardsTheIssueShouldBeIn: GitHubProjectBoard[];
}) {
	// We always handle it on GitHub side, regardless of the cache. Mostly this should prevent ZenHub also triggering GitHub
	addEventGap(issueOrPullRequest.issueId, {
		event: 'statusUpdate',
		data: {
			newStatus: StatusFieldValues.NewIssue,
		},
		timestamp: Date.now(),
	});

	// Add to all boards as new issue
	await Promise.all(
		boardsTheIssueShouldBeIn.map(async (board) => {
			const statusFieldValue = board.statusFieldOptions.find(
				(option) => option.name === StatusFieldValues.NewIssue,
			);

			if (!statusFieldValue) {
				logger.error(`Status field value not found for new issue in board ${board.projectId}`, {
					repository: repository.name,
					issue: issueOrPullRequest.number,
					board: board.projectId,
				});
				return;
			}

			await ctx.github.addIssueOrPullRequestToProjectBoard({
				issueOrPullRequestId: issueOrPullRequest.issueId,
				projectBoardId: board.projectId,
				statusUpdate: {
					fieldId: board.statusFieldId,
					value: statusFieldValue.id,
				},
			});
		}),
	);

	const zenhubPipelineId = ctx
		.getConfig()
		.zenhubPipelines.find((pipeline) => pipeline.name === StatusFieldValues.NewIssue)?.id;

	if (!zenhubPipelineId) {
		logger.error(`ZenHub pipeline not found for new issue`, {
			repository: repository.name,
			issue: issueOrPullRequest.number,
		});
	} else {
		await ctx.zenhub.setIssuePipeline({
			issueId: zenhubIssue.id,
			pipelineId: zenhubPipelineId,
		});
	}

	logger.info(`Added issue to all boards on "New Issues" pipeline`, {
		repository: repository.name,
		issue: issueOrPullRequest.number,
		boards: boardsTheIssueShouldBeIn.map((board) => board.projectId),
	});
}

async function handleClosedIssueOrPullRequest({
	logger,
	repository,
	issueOrPullRequest,
	boardsTheIssueShouldBeIn,
}: {
	logger: Log;
	repository: Repository;
	issueOrPullRequest: GetIssueOrPullRequestByNumberResult;
	boardsTheIssueShouldBeIn: GitHubProjectBoard[];
}) {
	addEventGap(issueOrPullRequest.issueId, {
		event: 'statusUpdate',
		data: {
			newStatus: StatusFieldValues.Closed,
		},
		timestamp: Date.now(),
	});

	await Promise.all(
		boardsTheIssueShouldBeIn.map(async (board) => {
			const statusFieldValue = board.statusFieldOptions.find(
				(option) => option.name === StatusFieldValues.Closed,
			);

			if (!statusFieldValue) {
				logger.error(`Status field value not found for closed issue in board ${board.projectId}`, {
					repository: repository.name,
					issue: issueOrPullRequest.number,
					board: board.projectId,
				});
				return;
			}

			await ctx.github.addIssueOrPullRequestToProjectBoard({
				issueOrPullRequestId: issueOrPullRequest.issueId,
				projectBoardId: board.projectId,
				statusUpdate: {
					fieldId: board.statusFieldId,
					value: statusFieldValue.id,
				},
			});
		}),
	);

	// Closed is automatic on ZenHub so we don't need to do anything there

	logger.info(`Issue closed, marked on all boards`, {
		repository: repository.name,
		issue: issueOrPullRequest.number,
		boards: boardsTheIssueShouldBeIn.map((board) => board.projectId),
	});
}

async function handleLabeledIssueOrPullRequest({
	logger,
	repository,
	issueOrPullRequest,
	boardsTheIssueShouldBeIn,
}: {
	logger: Log;
	repository: Repository;
	issueOrPullRequest: GetIssueOrPullRequestByNumberResult;
	boardsTheIssueShouldBeIn: GitHubProjectBoard[];
}) {
	const existingIssueBoards = await ctx.github.getIssueProjectBoards({
		repositoryName: repository.name,
		issueOrPullRequestNumber: issueOrPullRequest.number,
		issueOrPullRequestId: issueOrPullRequest.issueId,
	});

	const { status, estimate } = await ctx.github.fetchIssueOrPullRequestStateFromGlobalBoard({
		repositoryName: repository.name,
		issueId: issueOrPullRequest.issueId,
	});

	const boardsToAddTo = boardsTheIssueShouldBeIn.filter(
		(board) => !existingIssueBoards.some((b) => b.projectBoardId === board.projectId),
	);

	if (boardsToAddTo.length > 0) {
		await Promise.all(
			boardsToAddTo.map(async (board) => {
				const statusFieldValue = board.statusFieldOptions.find((option) => option.name === status);

				if (!statusFieldValue) {
					logger.error(`Status field value not found for labeled issue in board ${board.projectId}`, {
						repository: repository.name,
						issue: issueOrPullRequest.number,
						board: board.projectId,
					});
				}

				await ctx.github.addIssueOrPullRequestToProjectBoard({
					issueOrPullRequestId: issueOrPullRequest.issueId,
					projectBoardId: board.projectId,
					statusUpdate: statusFieldValue
						? {
								fieldId: board.statusFieldId,
								value: statusFieldValue.id,
							}
						: undefined,
					estimateUpdate: estimate
						? {
								fieldId: board.estimateFieldId,
								value: estimate,
							}
						: undefined,
				});
			}),
		);

		logger.info(`Added issue to new boards`, {
			repository: repository.name,
			issue: issueOrPullRequest.number,
			newBoards: boardsToAddTo.map((board) => board.projectId),
		});
	} else {
		logger.info(`Issue already in all boards`, {
			repository: repository.name,
			issue: issueOrPullRequest.number,
			boards: existingIssueBoards.map((board) => board.projectBoardId),
		});
	}
}

async function handleUnlabeledIssueOrPullRequest({
	logger,
	repository,
	issueOrPullRequest,
	boardsTheIssueShouldBeIn,
}: {
	logger: Log;
	repository: Repository;
	issueOrPullRequest: GetIssueOrPullRequestByNumberResult;
	boardsTheIssueShouldBeIn: GitHubProjectBoard[];
}) {
	const allBoardIdsConfigured = ctx.getAllBoardIdsConfigured();

	const existingIssueBoards = await ctx.github.getIssueProjectBoards({
		repositoryName: repository.name,
		issueOrPullRequestNumber: issueOrPullRequest.number,
		issueOrPullRequestId: issueOrPullRequest.issueId,
	});

	const boardsToRemoveFrom = existingIssueBoards.filter((board) => {
		// Not a board we handle -> probably manual, keep those
		if (!allBoardIdsConfigured.includes(board.projectBoardId)) {
			return false;
		}

		return !boardsTheIssueShouldBeIn.some((b) => b.projectId === board.projectBoardId);
	});

	if (boardsToRemoveFrom.length > 0) {
		await Promise.all(
			boardsToRemoveFrom.map(async (board) => {
				await ctx.github.removeIssueFromProjectBoard({
					projectBoardId: board.projectBoardId,
					itemId: board.projectItemId,
				});
			}),
		);

		logger.info(`Removed issue from boards`, {
			repository: repository.name,
			issue: issueOrPullRequest.number,
			removedBoards: boardsToRemoveFrom.map((board) => board.projectBoardId),
		});
	} else {
		logger.info(`Issue does not need to be removed from any boards`, {
			repository: repository.name,
			issue: issueOrPullRequest.number,
		});
	}
}

async function handleIssuesEvent(c: AppContext) {
	const logger = c.get('logger');

	const body = c.get('rawJsonBody') as unknown as IssuesEvent;

	const {
		action,
		issue: { node_id: issueNodeId, number: issueNumber },
		repository,
	} = body;

	const issueFromGitHub = await ctx.github.getIssueOrPullRequestByNumber({
		repositoryName: body.repository.name,
		issueNumber,
	});

	const issueFromZenHub = await ctx.zenhub.getIssueInfoByNumber({
		repositoryGitHubNumber: repository.id,
		issueNumber,
	});

	logger.debug('[GITHUB] Issue data', {
		repository: repository.name,
		githubNumericId: issueNumber,
		githubNodeId: issueNodeId,
		zenhubId: issueFromZenHub.id,
	});

	const labels = issueFromGitHub.labels.map((label) => label.name);

	const boardsTheIssueShouldBeIn = ctx.config.matchers.githubProjectBoardIdsByLabels(ctx.getConfig(), labels);

	switch (action) {
		case 'opened':
		case 'reopened': {
			await handleOpenedIssueOrPullRequest({
				logger,
				repository,
				issueOrPullRequest: issueFromGitHub,
				zenhubIssue: issueFromZenHub,
				boardsTheIssueShouldBeIn,
			});

			break;
		}

		case 'closed': {
			await handleClosedIssueOrPullRequest({
				logger,
				repository,
				issueOrPullRequest: issueFromGitHub,
				boardsTheIssueShouldBeIn,
			});

			break;
		}

		case 'labeled': {
			await handleLabeledIssueOrPullRequest({
				logger,
				repository,
				issueOrPullRequest: issueFromGitHub,
				boardsTheIssueShouldBeIn,
			});

			break;
		}

		case 'unlabeled': {
			await handleUnlabeledIssueOrPullRequest({
				logger,
				repository,
				issueOrPullRequest: issueFromGitHub,
				boardsTheIssueShouldBeIn,
			});

			break;
		}

		// TODO: maybe we need this
		case 'transferred':
			break;

		// Ignored events
		case 'assigned':
		case 'unassigned':
		case 'deleted':
		case 'milestoned':
		case 'demilestoned':
		case 'edited':
		case 'locked':
		case 'pinned':
		case 'unlocked':
		case 'unpinned':
			break;

		default:
			// @ts-expect-error - this is fine
			logger.warning(`Unhandled issues event action: ${body.action}`);
	}

	return handledBody(c);
}

async function handlePullRequestsEvent(c: AppContext) {
	const logger = c.get('logger');

	const body = c.get('rawJsonBody') as unknown as PullRequestEvent;

	const {
		action,
		pull_request: { number: pullRequestNumber, node_id: pullRequestNodeId },
		repository,
	} = body;

	const issueFromGitHub = await ctx.github.getIssueOrPullRequestByNumber({
		repositoryName: body.repository.name,
		issueNumber: pullRequestNumber,
	});

	const issueFromZenHub = await ctx.zenhub.getIssueInfoByNumber({
		repositoryGitHubNumber: repository.id,
		issueNumber: pullRequestNumber,
	});

	logger.debug('[GITHUB] Pull request event', {
		repository: repository.name,
		githubNumericId: pullRequestNumber,
		githubNodeId: pullRequestNodeId,
		action,
		zenhubId: issueFromZenHub.id,
	});

	const labels = issueFromGitHub.labels.map((label) => label.name);

	const boardsTheIssueShouldBeIn = ctx.config.matchers.githubProjectBoardIdsByLabels(ctx.getConfig(), labels);

	switch (action) {
		case 'opened':
		case 'reopened': {
			await handleOpenedIssueOrPullRequest({
				logger,
				repository,
				issueOrPullRequest: issueFromGitHub,
				zenhubIssue: issueFromZenHub,
				boardsTheIssueShouldBeIn,
			});

			break;
		}

		case 'closed': {
			await handleClosedIssueOrPullRequest({
				logger,
				repository,
				issueOrPullRequest: issueFromGitHub,
				boardsTheIssueShouldBeIn,
			});

			break;
		}

		case 'labeled': {
			await handleLabeledIssueOrPullRequest({
				logger,
				repository,
				issueOrPullRequest: issueFromGitHub,
				boardsTheIssueShouldBeIn,
			});

			break;
		}

		case 'unlabeled': {
			await handleUnlabeledIssueOrPullRequest({
				logger,
				repository,
				issueOrPullRequest: issueFromGitHub,
				boardsTheIssueShouldBeIn,
			});

			break;
		}

		// Ignored events
		case 'assigned':
		case 'unassigned':
		case 'milestoned':
		case 'demilestoned':
		case 'edited':
		case 'locked':
		case 'unlocked':
		case 'auto_merge_enabled':
		case 'auto_merge_disabled':
		case 'converted_to_draft':
		case 'ready_for_review':
		case 'enqueued':
		case 'dequeued':
		case 'review_requested':
		case 'review_request_removed':
		case 'synchronize':
			break;

		default:
			// @ts-expect-error - this is fine
			logger.warning(`Unhandled issues event action: ${body.action}`);
	}

	return handledBody(c);
}

interface ProjectsV2NumberFieldValueEdit {
	field_node_id: string;
	field_type: 'number';
	field_name: string;
	project_number: number;
	// Apparently this is always returned as a string when not null
	from?: number | string | null;
	// But this is a number 🤦
	// AND UNDEFINED WHEN NOT SET/cleared out
	to?: number | null;
}

interface ProjectsV2SingleSelectFieldValueEdit {
	field_node_id: string;
	field_type: 'single_select';
	field_name: string;
	project_number: number;
	from?: { id: string; name: string; color: string; description: string } | null;
	to?: { id: string; name: string; color: string; description: string } | null;
}

type ProjectsV2FieldEditedEventChangesFieldValue =
	| ProjectsV2NumberFieldValueEdit
	| ProjectsV2SingleSelectFieldValueEdit
	| Extract<ProjectsV2ItemEditedEvent['changes']['field_value'], { field_type: 'date' | 'text' | 'iteration' }>;

async function handleProjectsV2ItemEvent(c: AppContext) {
	const logger = c.get('logger');

	const body = c.get('rawJsonBody') as unknown as ProjectsV2ItemEvent;

	const {
		action,
		projects_v2_item: { project_node_id: projectNodeId, content_node_id: contentNodeId, content_type: contentType },
	} = body;

	const entityFromGitHub = await ctx.github.getIssueOrPullRequestLabelsByContentId({
		contentId: contentNodeId,
	});

	const entityFromZenHub = await ctx.zenhub.getIssueInfoByNumber({
		repositoryGitHubNumber: entityFromGitHub.repository.databaseId,
		issueNumber: entityFromGitHub.number,
	});

	logger.debug('[GITHUB] Projects V2 item event', {
		action,
		projectNodeId,
		contentType,
		contentNodeId,
		entityFromGitHub,
	});

	const labels = entityFromGitHub.labels.map((label) => label.name);

	const boardsTheIssueShouldBeIn = ctx.config.matchers
		.githubProjectBoardIdsByLabels(ctx.getConfig(), labels)
		// Filter out the board that the event came from
		.filter((board) => board.projectId !== projectNodeId);

	switch (action) {
		case 'edited': {
			const { changes } = body;
			// Someone broke apify log's truncation...
			logger.debug(`[GITHUB] Projects V2 item edited: ${JSON.stringify(changes)}`);

			const fieldChange = changes.field_value as ProjectsV2FieldEditedEventChangesFieldValue;

			switch (fieldChange.field_type) {
				case 'number': {
					// Unfortunately, we have to deal with hard coded names...
					if (fieldChange.field_name !== StatusFieldNames.Estimate) {
						break;
					}

					const newEstimate = fieldChange.to ?? null;

					await runIfNoSimilarEventHappenedRecently(
						contentNodeId,
						{
							event: 'estimateUpdate',
							data: {
								newEstimate,
							},
							timestamp: Date.now(),
						},
						async () => {
							await Promise.all(
								boardsTheIssueShouldBeIn.map(async (board) => {
									await ctx.github.addIssueOrPullRequestToProjectBoard({
										issueOrPullRequestId: contentNodeId,
										projectBoardId: board.projectId,
										estimateUpdate: {
											fieldId: board.estimateFieldId,
											value: newEstimate,
										},
									});
								}),
							);

							await ctx.zenhub.setIssueEstimate({
								issueId: entityFromZenHub.id,
								estimate: newEstimate,
							});

							logger.info(`Updated estimate for entity in boards`, {
								entityType: entityFromGitHub.__typename,
								repository: entityFromGitHub.repository.name,
								number: entityFromGitHub.number,
								boards: boardsTheIssueShouldBeIn.map((board) => board.projectId),
								previousEstimate: fieldChange.from ?? null,
								newEstimate,
							});
						},
					);

					break;
				}

				case 'single_select': {
					// Unfortunately, we have to deal with hard coded names...
					if (fieldChange.field_name !== StatusFieldNames.Status) {
						break;
					}

					// Cleared status -> we'll use the "New Issues" pipeline
					// And GitHub does NOT return the previous status name if the field is cleared out... -.-
					const newStatusPipeline = fieldChange.to?.name ?? StatusFieldValues.NewIssue;

					await runIfNoSimilarEventHappenedRecently(
						contentNodeId,
						{
							event: 'statusUpdate',
							data: {
								newStatus: newStatusPipeline,
							},
							timestamp: Date.now(),
						},
						async () => {
							await Promise.all(
								boardsTheIssueShouldBeIn.map(async (board) => {
									const statusFieldValue = board.statusFieldOptions.find(
										(option) => option.name === newStatusPipeline,
									);

									if (!statusFieldValue) {
										logger.error(
											`Status field value not found for new status in board ${board.projectId}`,
											{
												repository: entityFromGitHub.repository.name,
												number: entityFromGitHub.number,
												board: board.projectId,
												status: newStatusPipeline,
											},
										);

										return;
									}

									await ctx.github.addIssueOrPullRequestToProjectBoard({
										issueOrPullRequestId: contentNodeId,
										projectBoardId: board.projectId,
										statusUpdate: {
											fieldId: board.statusFieldId,
											value: statusFieldValue.id,
										},
									});
								}),
							);

							const zenhubPipelineId = ctx
								.getConfig()
								.zenhubPipelines.find((pipeline) => pipeline.name === newStatusPipeline)?.id;

							if (!zenhubPipelineId) {
								logger.error(`ZenHub pipeline not found for new status`, {
									repository: entityFromGitHub.repository.name,
									number: entityFromGitHub.number,
									newStatusPipeline,
								});
							} else {
								await ctx.zenhub.setIssuePipeline({
									issueId: entityFromZenHub.id,
									pipelineId: zenhubPipelineId,
								});
							}

							logger.info(`Updated status for entity in boards`, {
								entityType: entityFromGitHub.__typename,
								repository: entityFromGitHub.repository.name,
								number: entityFromGitHub.number,
								boards: boardsTheIssueShouldBeIn.map((board) => board.projectId),
								previousStatus: fieldChange.from?.name ?? null,
								newStatus: newStatusPipeline,
							});
						},
					);

					break;
				}

				// Ignored types
				default:
					break;
			}

			break;
		}

		// Ignored events
		case 'created':
		case 'deleted':
		case 'archived':
		case 'restored':
		case 'converted':
		case 'reordered':
			break;

		default:
			// @ts-expect-error - this is fine
			logger.warning(`Unhandled projects V2 item event action: ${body.action}`);
	}

	return handledBody(c);
}

export function registerGitHubRoute(app: App) {
	// Signature check first
	app.use('/github', async (c, next) => {
		const rawBodyText = await c.req.text();
		const sha256 = c.req.header('X-Hub-Signature-256');

		if (!sha256) {
			return c.json({ error: 'X-Hub-Signature-256 header is required' }, 400);
		}

		const [, sigHex] = sha256.split('=');

		const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };
		const keyBytes = textEncoder.encode(envParseString('GITHUB_WEBHOOK_SECRET'));

		const key = await crypto.subtle.importKey('raw', keyBytes, algorithm, false, ['sign', 'verify']);
		const sigBytes = hexToBytes(sigHex);
		const dataBytes = textEncoder.encode(rawBodyText);

		const verified = await crypto.subtle.verify(algorithm, key, sigBytes, dataBytes);

		if (!verified) {
			return c.json({ error: 'Invalid signature' }, 400);
		}

		return await next();
	});

	app.post('/github', async (c) => {
		const logger = c.get('logger');

		const body = c.get('rawJsonBody') as unknown as ListenedEvent;
		const event = c.req.header('X-GitHub-Event') as WebhookEventName;

		if (hasRepository(body) && !allowedRepositories.includes(body.repository.name)) {
			logger.info('Ignoring event from not allowed repository', {
				repository: body.repository.name,
				event,
				action: body.action,
			});

			return handledBody(c);
		}

		logger.perf('[GITHUB] Received event');
		logger.perf(JSON.stringify(body, null, 2));

		// Fire and forget the promises
		if (isIssuesEvent(event, body)) {
			return handleIssuesEvent(c).catch((error) => {
				logger.error('Error handling issues event', {
					error,
					event,
					action: body.action,
					repository: body.repository.name,
					issueNumber: body.issue.number,
					issueNodeId: body.issue.node_id,
				});
			});
		}

		if (isPullRequestEvent(event, body)) {
			// Probably won't need this, tbd
			return handlePullRequestsEvent(c).catch((error) => {
				logger.error('Error handling pull requests event', {
					error,
					event,
					action: body.action,
					repository: body.repository.name,
					pullRequestNumber: body.pull_request.number,
					pullRequestNodeId: body.pull_request.node_id,
				});
			});
		}

		if (isProjectsV2ItemEvent(event, body)) {
			return handleProjectsV2ItemEvent(c).catch((error) => {
				const { creator, ...rest } = body.projects_v2_item;
				logger.error('Error handling projects V2 item event', {
					error,
					event,
					action: body.action,
					projectV2Item: rest,
				});
			});
		}

		logger.warning(`Unhandled event: ${event}`);
		logger.debug(JSON.stringify(body, null, 2));

		return handledBody(c);
	});
}
