import type { App } from '../app.ts';

export function registerGitHubRoute(app: App) {
	app.post('/github', async (c) => {
		const body = c.get('rawJsonBody');

		c.get('logger')('[GITHUB]', body);

		return c.json({});
	});
}
