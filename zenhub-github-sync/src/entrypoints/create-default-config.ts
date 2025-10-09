import '../lib/setup.ts';

import * as ctx from '../lib/ctx.ts';
import { DefaultConfig } from '../lib/config/_shared.ts';

const config = await ctx.config.parseConfig();

if (config === DefaultConfig) {
	const pipelines = await ctx.zenhub.getWorkspacePipelines(ctx.zenhub.getWorkspaceId());

	config.zenhubPipelines = pipelines.map((pipeline) => ({
		id: pipeline.id,
		name: pipeline.name,
		description: pipeline.description,
	}));

	await ctx.config.serializeConfig(config);

	console.log('Default config created');
} else {
	console.log('A configuration file already exists, will not overwrite it');
}
