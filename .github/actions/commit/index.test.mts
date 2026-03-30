import * as util from 'node:util';
import * as childProcess from 'node:child_process';

import { describe, afterEach, it, expect } from 'vitest';

import { status, FILE_STATUS } from './index.mts';

const exec = util.promisify(childProcess.exec);

describe('signed commit action', () => {
    afterEach(async () => {
        await exec('git reset .');
        await exec('git checkout -- .');
        await exec('git clean -fd');
    });

    it('correctly diffs files', async () => {
        await Promise.all([
            exec('echo "some test content" > new_file'),  // new file
            exec('echo "/*.some_pattern" >> .gitignore'), // changed file
            exec('cp .gitignore .gitignore.bak'),         // copied
            exec('rm package-lock.json'),                 // removed
        ]);
        await exec('git add .');

        const fileStatuses = await status();

        expect(fileStatuses.some(([status, path]) => path === 'new_file' && status === FILE_STATUS.ADDED)).toBeTruthy();
        expect(fileStatuses.some(([status, path]) => path === '.gitignore' && status === FILE_STATUS.MODIFIED)).toBeTruthy();
        expect(fileStatuses.some(([status, path]) => path === '.gitignore.bak' && status === FILE_STATUS.ADDED)).toBeTruthy();
        expect(fileStatuses.some(([status, path]) => path === 'package-lock.json' && status === FILE_STATUS.DELETED)).toBeTruthy();
    });

    it('handles paths with whitespace', async () => {
        const fileName = 'file with spaces.txt';

        await exec(`echo "some content" > '${fileName}'`);
        await exec(`git add '${fileName}'`);

        const fileStatuses = await status();
        expect(fileStatuses.at(0)).toEqual([FILE_STATUS.ADDED, fileName]);
    });
});
