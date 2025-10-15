import type { ExportResult } from '@opentelemetry/core';
import { ConsoleSpanExporter, InMemorySpanExporter, type ReadableSpan } from '@opentelemetry/sdk-trace-node';

export const consoleExporter = new ConsoleSpanExporter();

export class OTelExporter extends InMemorySpanExporter {
	override export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
		super.export(spans, resultCallback);

		if (process.env.NODE_ENV !== 'development') {
			for (const span of spans) {
				console.log(JSON.stringify(consoleExporter['_exportInfo'](span), null, 2));
			}
		}
	}
}
