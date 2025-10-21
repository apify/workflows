import type { App } from '../app.ts';
import { addEventGap, type EventGap } from './_shared.ts';

export function registerInternalRoute(app: App) {
	app.post('/internal/event-cache-queue', async (c) => {
		const ua = c.req.header('User-Agent');

		if (ua !== 'zenhub-github-sync/internal') {
			return c.json({ error: 'Unauthorized' }, 401);
		}

		const body = c.get('rawJsonBody') as unknown as {
			entityId: string;
			event: EventGap;
		};

		addEventGap(body.entityId, body.event);

		return c.json({ message: 'Event cached' });
	});
}
