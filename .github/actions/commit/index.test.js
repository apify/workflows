const util = require('node:util');
const childProcess = require('node:child_process');

const { status, FILE_STATUS } = require('./index.js');

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
