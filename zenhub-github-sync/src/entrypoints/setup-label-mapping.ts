import '../lib/setup.ts';

import * as ctx from '../lib/ctx.ts';
import { confirm, input } from '@inquirer/prompts';
import { exit } from 'node:process';
import type { LabelMapping } from '../lib/config/_exports.ts';

const config = await ctx.config.parseConfig();

console.log('Fetching all project boards available...');
const allProjectBoards = await ctx.github.getProjectBoards();
console.log(`Found ${allProjectBoards.length} project boards`);

const rawLabels = await input({
	message: 'Enter a list of comma separated labels that an issue should have to be added to a specific board',
	required: true,
});

const labels = rawLabels.split(',').map((label) => label.trim());

const existingEntryIdx = config.labelMappings.findIndex((labelMapping) =>
	labelMapping.labels.every((label) => labels.includes(label)),
);

if (existingEntryIdx !== -1) {
	const shouldRemake = await confirm({
		message: 'An entry with the same labels already exists. Would you like to remake it?',
		default: false,
	});

	if (!shouldRemake) {
		exit(0);
	}
}

const { board, statusFieldId, statusFieldOptions, estimateFieldId } = await ctx.prompts.selectGitHubProjectBoard(
	'Select a project board to point to by the labels',
);

const newEntry: LabelMapping = {
	labels,
	githubBoardId: board.id,
	statusFieldId: statusFieldId,
	statusFieldOptions: statusFieldOptions,
	estimateFieldId: estimateFieldId,
	sourceOfTruth: null,
	behaviorWhenMismatch: null,
};

if (existingEntryIdx !== -1) {
	config.labelMappings[existingEntryIdx] = newEntry;
} else {
	config.labelMappings.push(newEntry);
}

await ctx.config.serializeConfig(config);

console.log('Label mapping setup complete');
