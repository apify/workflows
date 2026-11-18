import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchCodeOwnerLogins } from './fetch_code_owner_logins.js';

describe('test release PR helpers', () => {
    const fetchBackup = fetch;
    afterEach(() => {
        global.fetch = fetchBackup;
    });

    it('parses codeowners correctly', async () => {
        // @ts-ignore
        global.fetch = vi.fn(async () => {
            return {
                ok: true,
                // eslint-disable-next-line no-use-before-define
                text: () => Promise.resolve(codeownersFileContents),
            };
        });

        const codeowners = await fetchCodeOwnerLogins({ githubToken: 'abc', pullNumber: 12345 });
        expect(Array.from(codeowners)).toEqual([
            'jancurn',
            'BraniganLee',
            'HonzaKirchner',
            'jbartadev',
            'webrdaniel',
            'katzino',
            'terezavrchovinova',
            'Omastto1',
            'Jkuzz',
        ]);
    });
});

const codeownersFileContents = `\
# Code owners are automatically requested for review when someone opens a pull request that modifies code that they own.
# See: https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/about-code-owners


/src/app/imports/lib/billing        @jancurn
/src/app/imports/lib/finance        @jancurn
/src/storage/src/billing            @jancurn

# Copy check done by @BraniganLee with @davidjohnbarton being a backup in case of Theo's vacation

/src/packages/intl/src/en/                                  @BraniganLee
/src/packages/errors/src/errors/                            @BraniganLee
/src/packages/email-templates/src/templates                 @BraniganLee

/src/packages/ui-library/                                   @HonzaKirchner @jbartadev
/src/packages/ui-library/src/components/code                @webrdaniel
/src/packages/ui-library/src/components/readme_renderer     @webrdaniel

/src/packages/analytics/                                    @jbartadev @katzino

/src/packages/ui-components/                                @HonzaKirchner @jbartadev

/tests/ui_app                                               @terezavrchovinova

# Data team should know about changes in indexes in mongo and schemas
/src/packages/mongo-indexes/src     @Omastto1
/src/packages/mongo-indexes/src/CHANGELOG.md
/src/packages/mongo-indexes/src/package.json
/src/packages/schemas/src           @Omastto1
/src/packages/schemas/src/CHANGELOG.md
/src/packages/schemas/src/package.json

# Affiliate tracking
/src/console/frontend/src/ui/tracking/first_promoter.js                 @jancurn @jbartadev @Omastto1
/src/packages/users-server/src/first_promoter.ts                        @jancurn @jbartadev @Omastto1
/src/daemons/event_driven/src/lambdas/finance/first_promoter_daemon.ts  @jancurn @jbartadev @Omastto1

# Store discovery
/src/packages/ui-components/src/store                                   @Jkuzz
/src/console/backend/src/lib/controllers/actor_store.controller.ts      @Jkuzz
/src/console/backend/src/lib/services/actor_store.service.ts            @Jkuzz
`;
