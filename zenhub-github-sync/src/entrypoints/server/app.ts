import '../../lib/setup.ts';

import { serve } from '@hono/node-server';
import { otel } from '@hono/otel';
import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { envParseBoolean, envParseInteger } from '@skyra/env-utilities';
import type { Log } from 'apify';
import { Actor, log } from 'apify';
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';

import { consoleExporter, OTelExporter } from './lib/OTelExporter.ts';
import { registerGitHubRoute } from './routes/github.ts';
import { registerZenHubRoute } from './routes/zenhub.ts';

const traceExporter = new OTelExporter();

const sdk = new NodeSDK({
	traceExporter,
	serviceName: 'zenhub-github-sync',
});

sdk.start();

log.setLevel(
	// eslint-disable-next-line no-nested-ternary
	envParseBoolean('PERF', false)
		? log.LEVELS.PERF
		: envParseBoolean('DEBUG', false)
			? log.LEVELS.DEBUG
			: log.LEVELS.INFO,
);

const app = new Hono<{
	Variables: {
		logger: Log;
		rawJsonBody: Record<string, unknown>;
	};
}>()
	.use(otel())
	.use(requestId())
	.use(
		bodyLimit({
			// 1MB
			maxSize: 1 * 1024 * 1024,
			onError(c) {
				return c.json({ error: 'Request body too large' }, 413);
			},
		}),
	)
	.use(async (c, next) => {
		const reqId = c.get('requestId');

		c.set(
			'logger',
			log.child({
				prefix: `[${reqId}]`,
			}),
		);

		trace.getActiveSpan()?.setAttribute('apify.request_id', reqId);

		return await logger((...args) => {
			log.info(`[${reqId}] ${args.join(' ')}`);
		})(c, next);
	})
	.use(async (c, next) => {
		if (c.req.method !== 'POST') {
			return await next();
		}

		const contentType = c.req.header('Content-Type');
		const reqId = c.get('requestId');

		log.perf(`[${reqId}] Received request with Content-Type: ${contentType ?? 'missing header'}`);

		if (
			!contentType?.startsWith('application/json') &&
			!contentType?.startsWith('application/x-www-form-urlencoded')
		) {
			return c.json(
				{
					error: `Invalid or missing content type, received: ${contentType ?? 'missing header'}, expected one of: application/json, application/x-www-form-urlencoded`,
					status: 415,
				},
				415,
			);
		}

		const text = await c.req.text();

		if (contentType.startsWith('application/x-www-form-urlencoded')) {
			try {
				const params = new URLSearchParams(text);
				c.set('rawJsonBody', Object.fromEntries(params.entries()));
				return await next();
			} catch (urlSearchParamsParseError) {
				log.error(`[${reqId}] Body cannot be parsed as URLSearchParams`, {
					rawJsonBody: text,
					error: urlSearchParamsParseError,
				});
			}
		}

		if (contentType.startsWith('application/json')) {
			try {
				c.set('rawJsonBody', JSON.parse(text));
				return await next();
			} catch (jsonParseError) {
				log.error(`[${reqId}] Body cannot be parsed as JSON`, {
					rawJsonBody: text,
					error: jsonParseError,
				});
			}
		}

		return c.json({ error: `Unparseable body received`, status: 422 }, 422);
	})
	.get('/otel', (c) => {
		const rawSpans = traceExporter.getFinishedSpans();

		const spans = rawSpans.map((span) => consoleExporter['_exportInfo'](span));

		return c.json(spans);
	})
	.get('/', (c) => c.text("The Maze isn't meant for you.", 404));

export type App = typeof app;

export type AppContext = App extends Hono<infer U> ? Context<U> : never;

// Register routes
registerGitHubRoute(app);
registerZenHubRoute(app);

// Start server
const port = envParseInteger('ACTOR_WEB_SERVER_PORT', 3000);

const server = serve(
	{
		fetch: app.fetch,
		port,
	},
	() => {
		log.info(`Server started on port ${port}`);
	},
);

process.on('SIGINT', () => {
	log.info('SIGINT received, shutting down server');
	server.close();
});

process.on('SIGTERM', () => {
	log.info('SIGTERM received, shutting down server');
	server.close();
});

process.on('SIGQUIT', () => {
	log.info('SIGQUIT received, shutting down server');
	server.close();
});

Actor.on('migrating', async () => {
	log.info('Migrating, shutting down server');
	server.close();
	await Actor.exit({ timeoutSecs: 1, exit: true });
});

Actor.on('aborting', async () => {
	log.info('Aborting, shutting down server');
	server.close();
	await Actor.exit({ timeoutSecs: 1, exit: true });
});
