import { setup } from '@skyra/env-utilities';

import * as ctx from './ctx.ts';

setup({ path: new URL('../../.env', import.meta.url) });
await ctx.setup();
