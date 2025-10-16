import type { IssuesEvent, ProjectsV2ItemEvent, PullRequestEvent, WebhookEventName } from '@octokit/webhooks-types';
import { envParseString } from '@skyra/env-utilities';

import * as ctx from '../../../lib/ctx.ts';
import type { App, AppContext } from '../app.ts';
import { StatusFieldNames } from '../lib/consts.ts';
import { allowedRepositories, handledBody } from '../lib/utils.ts';

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

async function handleIssuesEvent(c: AppContext) {
	const logger = c.get('logger');

	const body = c.get('rawJsonBody') as unknown as IssuesEvent;

	const {
		action,
		issue: { node_id: issueNodeId, number: issueNumber },
		repository,
	} = body;

	const issueFromGitHub = await ctx.github.getIssueByNumber({
		repositoryName: body.repository.name,
		issueNumber,
	});

	const issueFromZenHub = await ctx.zenhub.getIssueInfoByNumber({
		repositoryGitHubNumber: repository.id,
		issueNumber,
	});

	logger.debug('Issue data', {
		repository: repository.name,
		githubNumericId: issueNumber,
		githubNodeId: issueNodeId,
		zenhubId: issueFromZenHub.id,
	});

	const labels = issueFromGitHub.labels.map((label) => label.name);

	const allBoardIdsConfigured = ctx.getAllBoardIdsConfigured();
	const boardsTheIssueShouldBeIn = ctx.config.matchers.githubProjectBoardIdsByLabels(ctx.getConfig(), labels);

	switch (action) {
		case 'opened':
		case 'reopened': {
			// Add to all boards as new issue
			await Promise.all(
				boardsTheIssueShouldBeIn.map(async (board) => {
					const statusFieldValue = board.statusFieldOptions.find(
						(option) => option.name === StatusFieldNames.NewIssue,
					);

					if (!statusFieldValue) {
						logger.error(`Status field value not found for new issue in board ${board.projectId}`, {
							repository: repository.name,
							issue: issueNumber,
							board: board.projectId,
						});
						return;
					}

					await ctx.github.addIssueToProjectBoard({
						issueId: issueNodeId,
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
				.zenhubPipelines.find((pipeline) => pipeline.name === StatusFieldNames.NewIssue)?.id;

			if (!zenhubPipelineId) {
				logger.error(`ZenHub pipeline not found for new issue`, {
					repository: repository.name,
					issue: issueNumber,
				});
			} else {
				await ctx.zenhub.setIssuePipeline({
					issueId: issueFromZenHub.id,
					pipelineId: zenhubPipelineId,
				});
			}

			logger.info(`Added issue to all boards on "New Issues" pipeline`, {
				repository: repository.name,
				issue: issueNumber,
				boards: boardsTheIssueShouldBeIn.map((board) => board.projectId),
			});

			break;
		}

		case 'closed': {
			await Promise.all(
				boardsTheIssueShouldBeIn.map(async (board) => {
					const statusFieldValue = board.statusFieldOptions.find(
						(option) => option.name === StatusFieldNames.Closed,
					);

					if (!statusFieldValue) {
						logger.error(`Status field value not found for closed issue in board ${board.projectId}`, {
							repository: repository.name,
							issue: issueNumber,
							board: board.projectId,
						});
						return;
					}

					await ctx.github.addIssueToProjectBoard({
						issueId: issueNodeId,
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
				issue: issueNumber,
				boards: boardsTheIssueShouldBeIn.map((board) => board.projectId),
			});

			break;
		}

		case 'labeled': {
			const existingIssueBoards = await ctx.github.getIssueProjectBoards({
				repositoryName: repository.name,
				issueNumber,
				issueId: issueNodeId,
			});

			const { status, estimate } = await ctx.github.fetchIssueStateFromGlobalBoard({
				repositoryName: repository.name,
				issueId: issueNodeId,
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
								issue: issueNumber,
								board: board.projectId,
							});
						}

						await ctx.github.addIssueToProjectBoard({
							issueId: issueNodeId,
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
					issue: issueNumber,
					newBoards: boardsToAddTo.map((board) => board.projectId),
				});
			} else {
				logger.info(`Issue already in all boards`, {
					repository: repository.name,
					issue: issueNumber,
					boards: existingIssueBoards.map((board) => board.projectBoardId),
				});
			}

			break;
		}

		case 'unlabeled': {
			const existingIssueBoards = await ctx.github.getIssueProjectBoards({
				repositoryName: repository.name,
				issueNumber,
				issueId: issueNodeId,
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
					issue: issueNumber,
					removedBoards: boardsToRemoveFrom.map((board) => board.projectBoardId),
				});
			} else {
				logger.info(`Issue does not need to be removed from any boards`, {
					repository: repository.name,
					issue: issueNumber,
				});
			}

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
			void handleIssuesEvent(c).catch((error) => {
				logger.error('Error handling issues event', {
					error,
					event,
					action: body.action,
					repository: body.repository.name,
					issueNumber: body.issue.number,
					issueNodeId: body.issue.node_id,
				});
			});
		} else if (isPullRequestEvent(event, body)) {
			void handledBody(c);
		} else if (isProjectsV2ItemEvent(event, body)) {
			void handledBody(c);
		} else {
			logger.warning(`Unhandled event: ${event}`);
			logger.debug(JSON.stringify(body, null, 2));
		}

		return handledBody(c);
	});
}
