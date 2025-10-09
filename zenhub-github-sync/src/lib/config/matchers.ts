import assert from 'node:assert';
import type { Config } from './_shared.ts';

export function githubProjectBoardIdsByLabels(config: Config, labels: string[]) {
	assert(config.globalBoard, 'Global board is not set');

	const returnArr = [
		{
			projectId: config.globalBoard.githubBoardId,
			statusFieldId: config.globalBoard.statusFieldId,
			statusFieldOptions: config.globalBoard.statusFieldOptions,
			estimateFieldId: config.globalBoard.estimateFieldId,
		},
	];

	for (const labelMapping of config.labelMappings) {
		if (labelMapping.labels.every((label) => labels.includes(label))) {
			returnArr.push({
				projectId: labelMapping.githubBoardId,
				statusFieldId: labelMapping.statusFieldId,
				statusFieldOptions: labelMapping.statusFieldOptions,
				estimateFieldId: labelMapping.estimateFieldId,
			});
		}
	}

	return returnArr;
}
