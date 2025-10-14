import './src/setup.ts';

import assert from 'node:assert';
import { exit } from 'node:process';

import { error, info } from '@actions/core';
import * as github from '@actions/github';

import * as ctx from '../../lib/ctx.ts';

const { action, issue, repository } = github.context.payload;

if (!issue || !repository || !action) {
	error('Issue not found');
	exit(1);
}

const labels = issue.labels.map((label: any) => label.name) as string[];

info(`Processing issue ${issue.number}...`);
info(`Issue: ${issue.number} on ${repository.owner.login}/${repository.name}`);
info(`Action: ${action}`);
info(`Labels: ${labels}`);

const config = await ctx.config.parseConfig();

assert(config.globalBoard, 'Global board is not set');

const boardsToAddTo = ctx.config.matchers.githubProjectBoardIdsByLabels(config, labels);

let statusToUse: string | null = null;

switch (action) {
	case 'opened':
	case 'reopened':
		statusToUse = 'New Issues';
		break;
	case 'closed':
		statusToUse = 'Closed';
		break;
	// Fallthrough -> will just be added to the right project boards
	case 'labeled':
	case 'unlabeled':
		break;
	default:
		error(`Unhandled action: ${action}`);
		exit(1);
}

const existingProjectBoards = await ctx.github.getIssueProjectBoards({
	repositoryName: repository.name,
	issueNumber: issue.number,
	issueId: issue.node_id,
});

const boardsToRemoveFrom = existingProjectBoards.filter(
	(board) => !boardsToAddTo.some((b) => b.projectId === board.projectBoardId),
);

await Promise.all(
	boardsToAddTo.map(async (board) => {
		await ctx.github.addIssueToProjectBoard({
			issueId: issue.node_id,
			projectBoardId: board.projectId,
			statusUpdate: statusToUse
				? {
						fieldId: board.statusFieldId,
						value: statusToUse,
					}
				: undefined,
		});
	}),
);

info(`Boards to remove from: ${boardsToRemoveFrom.map((b) => b.projectBoardTitle).join(', ')}`);

// TODO: if we want to do this
// await Promise.all(
// 	boardsToRemoveFrom.map((board) =>
// 		ctx.github.removeIssueFromProjectBoard({
// 			projectBoardId: board.projectBoardId,
// 			itemId: board.projectItemId,
// 		}),
// 	),
// );
