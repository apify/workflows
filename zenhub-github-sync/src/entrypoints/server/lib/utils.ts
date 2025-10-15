import type { Context } from 'hono';

export function handledBody(c: Context) {
	return c.json({ handled: true });
}
