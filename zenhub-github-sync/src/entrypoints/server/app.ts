import '../../lib/setup.ts';

import { serve } from '@hono/node-server';
import { otel } from '@hono/otel';
import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { envParseInteger } from '@skyra/env-utilities';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';

import { consoleExporter, OTelExporter } from './lib/OTelExporter.ts';
import { registerGitHubRoute } from './routes/github.ts';
import { registerZenHubRoute } from './routes/zenhub.ts';

const traceExporter = new OTelExporter();

const sdk = new NodeSDK({
	traceExporter,
});

sdk.start();

const app = new Hono<{
	Variables: {
		logger: (...args: any[]) => void;
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
		const contentType = c.req.header('Content-Type');
		const reqId = c.get('requestId');

		if (!contentType?.startsWith('application/json')) {
			return c.json(
				{
					error: `Invalid or missing content type, received: ${contentType ?? 'missing header'}, expected: application/json`,
					status: 415,
				},
				415,
			);
		}

		const text = await c.req.text();

		try {
			c.set('rawJsonBody', JSON.parse(text));

			return await next();
		} catch (error) {
			console.error(`[${reqId}] Unparseable JSON body received`, {
				rawJsonBody: text,
				error,
			});
			return c.json({ error: `Unparseable JSON body received`, status: 422 }, 422);
		}
	})
	.use(async (c, next) => {
		const reqId = c.get('requestId');

		c.set('logger', (...args) => {
			console.log(`[${reqId}]`, ...args);
		});

		trace.getActiveSpan()?.setAttribute('apify.request_id', reqId);

		// This should be the last middleware, which will deal with logging -> route calling -> end of logging and tracing
		return await logger((...args) => {
			console.log(`[${reqId}]`, ...args);
		})(c, next);
	})
	.get('/otel', (c) => {
		const rawSpans = traceExporter.getFinishedSpans();

		const spans = rawSpans.map((span) => consoleExporter['_exportInfo'](span));

		return c.json(spans);
	});

export type App = typeof app;

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
		console.log(`Server started on port ${port}`);
	},
);

process.on('SIGINT', () => {
	console.log('SIGINT received, shutting down server');
	server.close();
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down server');
	server.close();
	process.exit(0);
});

process.on('SIGQUIT', () => {
	console.log('SIGQUIT received, shutting down server');
	server.close();
	process.exit(0);
});
