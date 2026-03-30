import * as util from 'node:util';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as childProcess from 'node:child_process';

import { describe, afterEach, beforeEach, it, expect } from 'vitest';

import { status, FILE_STATUS } from './index.mts';

const exec = util.promisify(childProcess.exec);

describe('signed commit action', () => {
    let repoDir!: string;
    function doExec(command: string, options: childProcess.ExecOptionsWithStringEncoding = {}) {
        return exec(command, { cwd: repoDir, ...options });
    }

    beforeEach(async () => {
        repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apify-workflows-test-'));

        await doExec(`\
            git init
            git config user.name "test"
            git config user.name "test@apify.com"

            git commit --no-gpg-sign --allow-empty -m "initial message"
        `);
    });

    afterEach(async () => {
        await fs.rm(repoDir, { recursive: true, force: true });
    });

    it('correctly diffs files', async () => {
        // create some files, so we can modify them in the next step
        await doExec(`\
            echo 'node_modules' > .gitignore
            echo '{}' > package-lock.json

            git add .
            git commit --no-gpg-sign -m "commit with some files"
        `);

        await doExec(`\
            echo "some test content" > new_file     # A
            echo "/*.some_pattern" >> .gitignore    # M
            cp .gitignore .gitignore.bak            # A (copy)
            rm package-lock.json                    # D

            git add .
        `);

        const fileStatuses = await status({ cwd: repoDir });

        const newFileStat = fileStatuses.find(({ filePath }) => filePath === 'new_file');
        expect(newFileStat).toBeTruthy();
        expect(newFileStat!.fileStatus).toEqual(FILE_STATUS.ADDED);
        expect(newFileStat!.modeBefore).toEqual(0);
        expect(newFileStat!.modeAfter).toEqual(0o100644);

        const modifiedFileStat = fileStatuses.find(({ filePath }) => filePath === '.gitignore');
        expect(modifiedFileStat).toBeTruthy();
        expect(modifiedFileStat!.fileStatus).toEqual(FILE_STATUS.MODIFIED);
        expect(modifiedFileStat!.modeBefore).toEqual(modifiedFileStat!.modeAfter);

        const copiedFileStat = fileStatuses.find(({ filePath }) => filePath === '.gitignore.bak');
        expect(copiedFileStat).toBeTruthy();
        expect(copiedFileStat!.fileStatus).toEqual(FILE_STATUS.ADDED);
        expect(copiedFileStat!.modeBefore).toEqual(0);
        expect(copiedFileStat!.modeAfter).toEqual(0o100644);

        const deletedFileStat = fileStatuses.find(({ filePath }) => filePath === 'package-lock.json');
        expect(deletedFileStat).toBeTruthy();
        expect(deletedFileStat!.fileStatus).toEqual(FILE_STATUS.DELETED);
        expect(deletedFileStat!.modeBefore).toEqual(0o100644);
        expect(deletedFileStat!.modeAfter).toEqual(0);
    });

    it('handles paths with whitespace', async () => {
        const fileName = 'file with spaces.txt';

        await doExec(`echo "some content" > '${fileName}'`);
        await doExec(`git add '${fileName}'`);

        const fileStatuses = await status({ cwd: repoDir });
        const theFile = fileStatuses.at(0);
        expect(theFile).toBeTruthy();
        expect(theFile!.fileStatus).toEqual(FILE_STATUS.ADDED);
        expect(theFile!.filePath).toEqual(fileName);
    });
});
