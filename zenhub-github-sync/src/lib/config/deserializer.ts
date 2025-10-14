import { readFile } from 'node:fs/promises';

import yaml from 'js-yaml';
import toml from 'smol-toml';

import { type Config, DefaultConfig, getConfigPath, type LabelMapping, parser, type StoredConfig } from './_shared.ts';

function maybeParsePropertyWithComment<T>(property: unknown): T {
	if (typeof property === 'object' && property !== null && '//explanation' in property) {
		if ('value' in property) {
			return property.value as T;
		}
	}

	return property as T;
}

function parseDefaultProperties(config: Config, rawConfig: StoredConfig) {
	const defaultPropertiesObject = maybeParsePropertyWithComment<StoredConfig['defaultProperties']['value']>(
		rawConfig.defaultProperties,
	);

	config.defaultProperties.sourceOfTruth = maybeParsePropertyWithComment<
		Config['defaultProperties']['sourceOfTruth']
	>(defaultPropertiesObject.sourceOfTruth);

	config.defaultProperties.behaviorWhenMismatch = maybeParsePropertyWithComment<
		Config['defaultProperties']['behaviorWhenMismatch']
	>(defaultPropertiesObject.behaviorWhenMismatch);
}

function parseGlobalBoard(config: Config, rawConfig: StoredConfig) {
	const rawValue = maybeParsePropertyWithComment<StoredConfig['globalBoard']['value']>(rawConfig.globalBoard);

	if (rawValue) {
		config.globalBoard = {
			githubBoardId: maybeParsePropertyWithComment<Exclude<Config['globalBoard'], null>['githubBoardId']>(
				rawValue.githubBoardId,
			),
			sourceOfTruth: maybeParsePropertyWithComment<Exclude<Config['globalBoard'], null>['sourceOfTruth']>(
				rawValue.sourceOfTruth,
			),
			behaviorWhenMismatch: maybeParsePropertyWithComment<
				Exclude<Config['globalBoard'], null>['behaviorWhenMismatch']
			>(rawValue.behaviorWhenMismatch),
			statusFieldId: maybeParsePropertyWithComment<Exclude<Config['globalBoard'], null>['statusFieldId']>(
				rawValue.statusFieldId,
			),
			statusFieldOptions: maybeParsePropertyWithComment<
				Exclude<Config['globalBoard'], null>['statusFieldOptions']
			>(rawValue.statusFieldOptions),
			estimateFieldId: maybeParsePropertyWithComment<Exclude<Config['globalBoard'], null>['estimateFieldId']>(
				rawValue.estimateFieldId,
			),
		};
	} else {
		config.globalBoard = null;
	}
}

function parseLabelMappings(config: Config, rawConfig: StoredConfig) {
	const labelMappingsArray = maybeParsePropertyWithComment<StoredConfig['labelMappings']['value']>(
		rawConfig.labelMappings,
	);

	if (!labelMappingsArray) {
		config.labelMappings = [];
		return;
	}

	config.labelMappings = labelMappingsArray.map((labelMapping) => {
		return {
			labels: maybeParsePropertyWithComment<LabelMapping['labels']>(labelMapping.labels),
			githubBoardId: maybeParsePropertyWithComment<LabelMapping['githubBoardId']>(labelMapping.githubBoardId),
			statusFieldId: maybeParsePropertyWithComment<LabelMapping['statusFieldId']>(labelMapping.statusFieldId),
			statusFieldOptions: maybeParsePropertyWithComment<LabelMapping['statusFieldOptions']>(
				labelMapping.statusFieldOptions,
			),
			estimateFieldId: maybeParsePropertyWithComment<LabelMapping['estimateFieldId']>(
				labelMapping.estimateFieldId,
			),
			sourceOfTruth: maybeParsePropertyWithComment<LabelMapping['sourceOfTruth']>(labelMapping.sourceOfTruth),
			behaviorWhenMismatch: maybeParsePropertyWithComment<LabelMapping['behaviorWhenMismatch']>(
				labelMapping.behaviorWhenMismatch,
			),
		};
	});
}

function parseZenhubPipelines(config: Config, rawConfig: StoredConfig) {
	const pipelinesObject = maybeParsePropertyWithComment<StoredConfig['zenhubPipelines']['value']>(
		rawConfig.zenhubPipelines,
	);

	config.zenhubPipelines = pipelinesObject.map((pipeline) => ({
		id: pipeline.id,
		name: pipeline.name,
		description: pipeline.description,
	}));
}

export async function parseConfig() {
	const path = getConfigPath();

	const fileData = await readFile(path, 'utf8').catch(() => null);

	if (!fileData) {
		return DefaultConfig;
	}

	let rawConfig: StoredConfig;

	switch (parser) {
		case 'yaml':
			rawConfig = yaml.load(fileData) as StoredConfig;
			break;
		case 'toml':
			rawConfig = toml.parse(fileData) as unknown as StoredConfig;
			break;
		case 'json':
			rawConfig = JSON.parse(fileData) as StoredConfig;
			break;
		default:
			throw new Error(`Unsupported parser: ${parser}`);
	}

	const config: Config = {
		...DefaultConfig,
	};

	parseDefaultProperties(config, rawConfig);
	parseZenhubPipelines(config, rawConfig);
	parseLabelMappings(config, rawConfig);
	parseGlobalBoard(config, rawConfig);

	return config;
}
