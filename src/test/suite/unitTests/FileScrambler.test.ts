/* eslint-disable @typescript-eslint/naming-convention */
import * as mockFs from 'mock-fs'; // must be first!

import { assert } from 'chai';
import { FileScrambler } from '../../../utils/FileScrambler';
import { ActiveFile, Context } from '../../../types';
import * as path from 'path';

const fileSystemStructure = {
    'some/path': {
        'scenarios': {
            'sample1': {
                'input.txt': 'contents of input.txt',
                'step.x.txt': 'contents of step.x.txt'
            },
            'sample2': {
                'input.xml': 'input',
                'step.x.json': 'step.x',
                'step.y.xml': 'step.y',
                'step.z.txt': 'step.z',
            },
            'my.feature': 'some cucumber'
        },
        'my.integration.json': '{}',
        'my.schema.json': '{}',
        'template.sbn': 'contents of template.sbn'
    }
};

suite('FileScrambler Tests', () => {

    suiteTeardown(() => {
        mockFs.restore();
    });

    suite('determineContext()', () => {

        const okTests = [
            { file: 'some/path/my.integration.json' },
            { file: 'some/path/template.sbn' },
            { file: 'some/path/scenarios/sample1/input.txt' },
            { file: 'some/path/scenarios/sample1/step.x.txt' },
        ];

        okTests.forEach(({ file }) => {
            test(`OK with ${path.basename(file)} file`, () => {
                mockFs(fileSystemStructure);
                const activeFile: ActiveFile = { filepath: path.normalize(file), filecontent: '' };
                const result = FileScrambler.determineContext(activeFile, undefined) as Context;

                assert.isDefined(result);
                assert.equal(result.activeFile, activeFile);
                assert.equal(result.integrationFilename, 'my.integration.json');
                assert.equal(result.integrationFilePath, path.normalize('some/path/my.integration.json'));
            });
        });

        test('OK with currentContext', () => {
            mockFs(fileSystemStructure);
            const activeFile: ActiveFile = { filepath: 'some/path/scenarios/my.feature', filecontent: '' };
            const prevFile: ActiveFile = { filepath: 'some/path/template.sbn', filecontent: '' };
            const currentContext: Context = {
                activeFile: prevFile,
                integrationFilePath: path.normalize('some/path/my.integration.json'),
                integrationFilename: 'my.integration.json',
                activeScenario: { name: 'sample', path: 'scenarios/sample' },
                rootPath: 'some/path/'
            };
            const result = FileScrambler.determineContext(activeFile, currentContext) as Context;

            assert.isDefined(result);
            assert.equal(result.activeFile, activeFile);
            assert.equal(result.integrationFilename, 'my.integration.json');
            assert.equal(result.integrationFilePath, path.normalize('some/path/my.integration.json'));
        });

        test('OK /imports/ with currentContext', () => {
            mockFs({
                'here': {
                    'imports': {
                        'env.json': ''
                    },
                    'track': {
                        'scenarios': {
                            'sample': {
                                'input.txt': '',
                                'step.x.txt': ''
                            }
                        },
                        'track.integration.json': '{}',
                        'template.sbn': '',
                    }
                }
            });

            const activeFile: ActiveFile = { filepath: 'here/imports/env.json', filecontent: '' };
            const prevFile: ActiveFile = { filepath: 'here/track/template.sbn', filecontent: '' };
            const currentContext: Context = {
                activeFile: prevFile,
                integrationFilePath: path.normalize('here/track/track.integration.json'),
                integrationFilename: 'track.integration.json',
                activeScenario: { name: 'sample', path: 'here/track/scenarios/sample' },
                rootPath: 'here/track/'
            };
            const result = FileScrambler.determineContext(activeFile, currentContext) as Context;

            assert.isDefined(result);
            assert.equal(result.activeFile, activeFile);
            assert.equal(result.integrationFilename, 'track.integration.json');
            assert.equal(result.integrationFilePath, path.normalize('here/track/track.integration.json'));
        });

        test('No integration available', () => {
            mockFs({
                'other/path': {
                    'sample.pdf': ''
                }
            });
            const activeFile: ActiveFile = { filepath: 'other/path/sample.pdf', filecontent: '' };
            const result = FileScrambler.determineContext(activeFile, undefined);

            assert.isUndefined(result);
        });
    });

    suite('getStepTypes()', () => {
        const context: Context = {
            activeFile: { filecontent: '', filepath: ''},
            activeScenario: { name: '', path: '' },
            integrationFilename: 'my.integration.json',
            integrationFilePath: 'some/path/my.integration.json',
            rootPath: ''
        };

        test('Multiple steps finds types correctle', () => {
            mockFs({
                'some/path': {
                    'my.integration.json': `{
                        "Steps": [
                            { "$type": "StepType1, Core", "Id": "Step1" },
                            { "$type": "StepType2, Core", "Id": "Step2" }
                        ]
                    }`
                }
            });

            const result = FileScrambler.getStepTypes(context);
            
            assert.isDefined(result);
            assert.strictEqual(Object.keys(result).length, 2);
            assert.strictEqual(result['Step1'], 'StepType1, Core');
            assert.strictEqual(result['Step2'], 'StepType2, Core');
        });

        test('No steps works correctly', () => {
            mockFs({
                'some/path': {
                    'my.integration.json': '{}'
                }
            });

            const result = FileScrambler.getStepTypes(context);
            
            assert.isDefined(result);
            assert.strictEqual(Object.keys(result).length, 0);
        });
    });
});
