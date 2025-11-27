import { envParseBoolean } from '@skyra/env-utilities';

export function debugLog(...args: Parameters<typeof console.log>) {
	if (envParseBoolean('DEBUG')) {
		console.log(...args);
	}
}
