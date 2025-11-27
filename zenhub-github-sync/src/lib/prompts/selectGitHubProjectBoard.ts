import assert from 'node:assert';

import { input, search, Separator } from '@inquirer/prompts';

import { GitHubProjectBoardFieldType } from '../api/github/getProjectBoards.ts';
import * as ctx from '../ctx.ts';

export interface SelectGitHubProjectBoardResult {
	board: ctx.github.GitHubPartialProjectBoard;
	statusFieldId: string;
	statusFieldOptions: { id: string; name: string }[];
	estimateFieldId: string;
}

export async function selectGitHubProjectBoard(searchMessage: string): Promise<SelectGitHubProjectBoardResult> {
	const allProjectBoards = await ctx.github.getProjectBoards();

	const selectedBoardId = await search({
		message: searchMessage,
		source: (userInput) => {
			const results: ({ name: string; value: string } | Separator)[] = [];

			results.push({
				name: 'Create new project board',
				value: 'create_new_board',
			});
			results.push(new Separator());

			results.push(
				...allProjectBoards
					.filter((projectBoard) => projectBoard.title.toLowerCase().includes(userInput?.toLowerCase() ?? ''))
					.map((projectBoard) => ({
						name: projectBoard.title,
						value: projectBoard.id,
					})),
			);

			return results;
		},
	});

	if (selectedBoardId === 'create_new_board') {
		const newName = await input({
			message: 'Enter a name for the new project board',
		});

		const newBoard = await ctx.github.cloneFromTemplate(newName);

		const rawStatusField = newBoard.fields.find((field) => field.name === 'Status')!;

		assert(
			rawStatusField.__typename === GitHubProjectBoardFieldType.SingleSelect,
			'Status field must be a single select field',
		);

		return {
			board: newBoard,
			statusFieldId: rawStatusField.id,
			statusFieldOptions: rawStatusField.options,
			estimateFieldId: newBoard.fields.find((field) => field.name === 'Estimate')!.id,
		};
	}

	const board = allProjectBoards.find((projectBoard) => projectBoard.id === selectedBoardId)!;

	const statusFieldId = await search({
		message: 'Select the field that represents the status of the issue',
		source: (userInput) => {
			return board.fields
				.filter((field) => field.name.toLowerCase().includes(userInput?.toLowerCase() ?? ''))
				.map((field) => ({
					name: field.name,
					value: field.id,
				}));
		},
	});

	const rawStatusField = board.fields.find((field) => field.id === statusFieldId)!;

	assert(
		rawStatusField.__typename === GitHubProjectBoardFieldType.SingleSelect,
		'Status field must be a single select field',
	);

	const estimateFieldId = await search({
		message: 'Select the field that represents the estimate of the issue',
		source: (userInput) => {
			return board.fields
				.filter((field) => field.name.toLowerCase().includes(userInput?.toLowerCase() ?? ''))
				.map((field) => ({
					name: field.name,
					value: field.id,
				}));
		},
		validate(value) {
			if (value === statusFieldId) {
				return 'Status field cannot be the same as the estimate field';
			}

			return true;
		},
	});

	return {
		board,
		statusFieldId,
		statusFieldOptions: rawStatusField.options,
		estimateFieldId,
	};
}
