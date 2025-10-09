import toml from 'smol-toml';
import yaml from 'js-yaml';
import {
	getConfigPath,
	parser,
	type CommentedProperty,
	type Config,
	type LabelMapping,
	type StoredConfig,
} from './_shared.ts';
import { writeFile } from 'node:fs/promises';
import { inspect } from 'node:util';
import { debugLog } from '../utils.ts';

function serializeWithComment<T>(value: T, comment: string) {
	return {
		'//explanation': comment,
		value,
	};
}

function serializeDefaultProperties(defaultProperties: Config['defaultProperties']): StoredConfig['defaultProperties'] {
	return serializeWithComment(
		{
			behaviorWhenMismatch: serializeWithComment(
				defaultProperties.behaviorWhenMismatch,
				'Behavior when there is a mismatch between the source of truth and the actual value. If set to "overwrite", the value will be overwritten to whatever the source of truth says. If set to "ignore", the value will be skipped.',
			),
			sourceOfTruth: serializeWithComment(
				defaultProperties.sourceOfTruth,
				'Source of truth for the sync between ZenHub and GitHub. Will be used to determine which platform should be updated when there is a mismatch.',
			),
		},
		'Default properties for the sync between ZenHub and GitHub.',
	);
}

function serializeZenhubPipelines(zenhubPipelines: Config['zenhubPipelines']): StoredConfig['zenhubPipelines'] {
	return serializeWithComment(zenhubPipelines, 'A cache of the ZenHub pipelines to sync across project boards.');
}

function serializeLabelMappings(labelMappings: Config['labelMappings']): StoredConfig['labelMappings'] {
	return serializeWithComment(
		labelMappings.map((labelConfig, idx) => {
			if (idx === 0) {
				return {
					labels: serializeWithComment(
						labelConfig.labels,
						'The labels that an issue or pull request should have for it to be added to the specific GitHub project board.',
					),
					githubBoardId: serializeWithComment(
						labelConfig.githubBoardId,
						'The GitHub Board ID that is to be used for all issues or pull requests that have the specified labels.',
					),
					statusFieldId: serializeWithComment(
						labelConfig.statusFieldId,
						'The status field ID to use when setting the status of an issue.',
					),
					statusFieldOptions: serializeWithComment(
						labelConfig.statusFieldOptions,
						'The status field options to use when setting the status of an issue. Due to the nature of these fields, these options should match the pipeline names on ZenHub',
					),
					estimateFieldId: serializeWithComment(
						labelConfig.estimateFieldId,
						'The estimate field ID to use when setting the estimate of an issue.',
					),
					sourceOfTruth: serializeWithComment(
						labelConfig.sourceOfTruth,
						'The source of truth represents the platform that should be used to determine the status of an issue.',
					),
					behaviorWhenMismatch: serializeWithComment(
						labelConfig.behaviorWhenMismatch,
						'The behavior when there is a mismatch between the source of truth and the actual value. If set to "overwrite", the value will be overwritten to whatever the source of truth says. If set to "ignore", the value will be skipped.',
					),
				} satisfies CommentedProperty<LabelMapping>['value'] as unknown as LabelMapping;
			}

			return labelConfig;
		}),
		'A list of labels that should also be pointed to a specific GitHub project board. Only the first element will receive in-depth documentation for each field',
	);
}

function serializeGlobalBoard(globalBoard: Config['globalBoard'] | null): StoredConfig['globalBoard'] {
	return serializeWithComment(
		globalBoard
			? {
					githubBoardId: serializeWithComment(
						globalBoard.githubBoardId,
						'The GitHub Board ID that is to be used for all issues that get created across the organization.',
					),
					statusFieldId: serializeWithComment(
						globalBoard.statusFieldId,
						'The status field ID to use when setting the status of an issue.',
					),
					statusFieldOptions: serializeWithComment(
						globalBoard.statusFieldOptions,
						'The status field options to use when setting the status of an issue. Due to the nature of these fields, these options should match the pipeline names on ZenHub',
					),
					estimateFieldId: serializeWithComment(
						globalBoard.estimateFieldId,
						'The estimate field ID to use when setting the estimate of an issue.',
					),
					sourceOfTruth: serializeWithComment(
						globalBoard.sourceOfTruth,
						'The source of truth represents the platform that should be used to determine the status of an issue.',
					),
					behaviorWhenMismatch: serializeWithComment(
						globalBoard.behaviorWhenMismatch,
						'The behavior when there is a mismatch between the source of truth and the actual value. If set to "overwrite", the value will be overwritten to whatever the source of truth says. If set to "ignore", the value will be skipped.',
					),
				}
			: null,
		'The global board that holds all the issues.',
	);
}

export async function serializeConfig(config: Config) {
	const path = getConfigPath(parser);

	debugLog('Serializing config:', inspect(config, { depth: null }));

	const storedConfig: StoredConfig = {
		defaultProperties: serializeDefaultProperties(config.defaultProperties),
		zenhubPipelines: serializeZenhubPipelines(config.zenhubPipelines),
		labelMappings: serializeLabelMappings(config.labelMappings),
		globalBoard: serializeGlobalBoard(config.globalBoard),
	};

	debugLog('Serialized config:', inspect(storedConfig, { depth: null }));

	let fileContent: string;

	switch (parser) {
		case 'yaml':
			fileContent = yaml.dump(storedConfig);
			break;
		case 'toml':
			fileContent = toml.stringify(storedConfig);
			break;
		case 'json':
			fileContent = JSON.stringify(storedConfig, null, '\t');
			break;
		default:
			throw new Error(`Unsupported parser: ${parser}`);
	}

	await writeFile(path, fileContent);
}
