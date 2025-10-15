import { deflateSync } from 'node:zlib';

import type { ExportResult } from '@opentelemetry/core';
import { ConsoleSpanExporter, InMemorySpanExporter, type ReadableSpan } from '@opentelemetry/sdk-trace-node';

export const consoleExporter = new ConsoleSpanExporter();

export class OTelExporter extends InMemorySpanExporter {
	override export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
		super.export(spans, resultCallback);

		if (process.env.NODE_ENV !== 'development') {
			for (const span of spans) {
				const exported = consoleExporter['_exportInfo'](span);

				const compressed = deflateSync(JSON.stringify(exported));

				console.log('OTEL', compressed.toString('base64'));
			}
		}
	}
}
