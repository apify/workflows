import '../lib/setup.ts';

import * as ctx from '../lib/ctx.ts';
import { confirm } from '@inquirer/prompts';
import { exit } from 'node:process';

const config = await ctx.config.parseConfig();

if (config.globalBoard) {
	const shouldRemake = await confirm({
		message: 'A global board has already been configured. Would you like to mark a new one as the global board?',
		default: false,
	});

	if (!shouldRemake) {
		exit(0);
	}
}

const { board, statusFieldId, statusFieldOptions, estimateFieldId } = await ctx.prompts.selectGitHubProjectBoard(
	'Select a project board to mark as the global board',
);

config.globalBoard = {
	githubBoardId: board.id,
	statusFieldId: statusFieldId,
	statusFieldOptions: statusFieldOptions,
	estimateFieldId: estimateFieldId,
	sourceOfTruth: null,
	behaviorWhenMismatch: null,
};

await ctx.config.serializeConfig(config);

console.log('Global board setup complete');
