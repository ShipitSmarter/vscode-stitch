import { assert } from 'chai';
import { findCommandParentDirectory } from "../../../utils/helpers";

suite('Helpers tests', () => {

    suite('findCommandParentDirectory()', () => {

        test('Files in same folder', () => {
            const path1 = 'c:\\temp\\test.txt';
            const path2 = 'c:\\temp\\test.json';
            const common = findCommandParentDirectory(path1, path2);

            assert.equal(common, 'c:\\temp\\');
        });

        test('Multiple calls to method keep same parent', () => {
            const path1 = 'c:\\temp\\test.txt';
            const path2 = 'c:\\temp\\test.json';
            const common1 = findCommandParentDirectory(path1, path2);

            assert.isNotNull(common1);
            const common2 = findCommandParentDirectory(common1 as string, path2);
            assert.equal(common2, common1);
        });

        test('Files on other drive', () => {
            const path1 = 'c:\\temp\\test.txt';
            const path2 = 'd:\\temp\\test.json';
            const common = findCommandParentDirectory(path1, path2);

            assert.isUndefined(common);
        });

    });

});