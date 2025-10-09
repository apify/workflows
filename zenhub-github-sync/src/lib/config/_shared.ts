export const SourceOfTruth = {
	ZenHub: 'zenhub',
	GitHub: 'github',
} as const;

export type SourceOfTruth = (typeof SourceOfTruth)[keyof typeof SourceOfTruth];

export const BehaviorWhenMismatch = {
	Overwrite: 'overwrite',
	Ignore: 'ignore',
} as const;

export type BehaviorWhenMismatch = (typeof BehaviorWhenMismatch)[keyof typeof BehaviorWhenMismatch];

export interface DefaultProperties {
	sourceOfTruth: SourceOfTruth;
	behaviorWhenMismatch: BehaviorWhenMismatch;
}

export interface Pipeline {
	id: string;
	name: string;
	description: string;
}

export interface LabelMapping {
	labels: string[];
	githubBoardId: string;
	statusFieldId: string;
	statusFieldOptions: { id: string; name: string }[];
	estimateFieldId: string;
	sourceOfTruth: SourceOfTruth | null;
	behaviorWhenMismatch: BehaviorWhenMismatch | null;
}

export interface GlobalBoard {
	githubBoardId: string;
	statusFieldId: string;
	statusFieldOptions: { id: string; name: string }[];
	estimateFieldId: string;
	sourceOfTruth: SourceOfTruth | null;
	behaviorWhenMismatch: BehaviorWhenMismatch | null;
}

export interface Config {
	defaultProperties: DefaultProperties;
	zenhubPipelines: Pipeline[];
	labelMappings: LabelMapping[];
	globalBoard: GlobalBoard | null;
}

export type CommentedProperty<T, SkipNested = false> = T extends Array<infer U>
	? {
			'//explanation': string;
			value: U[];
		}
	: T extends {} & object
		? {
				'//explanation': string;
				value: {
					[K in keyof T]: SkipNested extends true ? T[K] : CommentedProperty<T[K], SkipNested>;
				};
			}
		: {
				'//explanation': string;
				value: T;
			};

export interface StoredConfig {
	defaultProperties: CommentedProperty<DefaultProperties>;
	zenhubPipelines: CommentedProperty<Pipeline[]>;
	labelMappings: CommentedProperty<LabelMapping[]>;
	globalBoard: CommentedProperty<GlobalBoard | null>;
}

export type ConfigParser = 'json' | 'yaml' | 'toml';

export const DefaultConfig: Config = {
	defaultProperties: {
		sourceOfTruth: SourceOfTruth.ZenHub,
		behaviorWhenMismatch: BehaviorWhenMismatch.Overwrite,
	},
	zenhubPipelines: [],
	labelMappings: [],
	globalBoard: null,
};

export const parser: ConfigParser = 'yaml';

export function getConfigPath(parser: ConfigParser): URL {
	return new URL(`../../../config.${parser}`, import.meta.url);
}
