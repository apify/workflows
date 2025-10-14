import type { App } from '../app.ts';

export function registerZenHubRoute(app: App) {
	app.post('/zenhub', async (c) => {
		const body = c.get('rawJsonBody');

		c.get('logger')('[ZENHUB]', c.body);

		return c.json({});
	});
}
