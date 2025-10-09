import '../../../lib/setup.ts';

declare module '@skyra/env-utilities' {
	interface Env {
		GITHUB_TOKEN: string;
		ZENHUB_TOKEN: string;
	}
}
