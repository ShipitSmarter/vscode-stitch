import * as mockFs from 'mock-fs'; // must be first!

import { assert, expect } from 'chai';
import { FileScrambler } from '../../../FileScrambler';
import { ActiveFile, Context, ScenarioSource } from '../../../types';
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
        'template.sbn': 'contents of template.sbn'
    }
};

suite('FileScrambler Tests', () => {

    suiteTeardown(() => {
        mockFs.restore();
    });

    suite('collectFiles()', () => {

        const scenario: ScenarioSource = {
            name: 'sample1',
            path: 'some/path/scenarios/sample1'
        };
        const context: Context = {
            activeFile: { filepath: 'no-file', filecontent: '' },
            integrationFilePath: 'some/path/my.integration.json',
            integrationFilename: 'my.integration.json',
            activeScenario: scenario,
        };

        function _noWorkspaceFile(): string | undefined {
            return undefined;
        }

        test('loads expected files', () => {
            mockFs(fileSystemStructure);
            const result = FileScrambler.collectFiles(context);

            assert.isNotNull(result);
            assert.equal(result.integrationFilePath, 'my.integration.json');

            assert.equal(result.files.length, 2);
            expect(result.files).to.deep.include({ filename: 'my.integration.json', filecontent: '{}' });
            expect(result.files).to.deep.include({ filename: 'template.sbn', filecontent: 'contents of template.sbn' });
            
            assert.equal(result.scenarioFiles.length, 2);
            assert.equal(result.scenarioFiles[0].filename, 'input.txt');
            assert.equal(result.scenarioFiles[0].filecontent, 'contents of input.txt');
            assert.equal(result.scenarioFiles[1].filename, 'step.x.txt');
            assert.equal(result.scenarioFiles[1].filecontent, 'contents of step.x.txt');
        });

        test('can handle (.txt, .json and .xml) extensions in scenario', () => {
            mockFs(fileSystemStructure);
            const sample2: ScenarioSource = {
                name: 'sample2',
                path: 'some/path/scenarios/sample2'
            };
            context.activeScenario = sample2;
            const result = FileScrambler.collectFiles(context, _noWorkspaceFile);

            assert.isNotNull(result);
            assert.equal(result.scenarioFiles.length, 4);
            expect(result.scenarioFiles).to.deep.include({ filename: 'input.xml', filecontent: 'input'});
            expect(result.scenarioFiles).to.deep.include({ filename: 'step.x.json', filecontent: 'step.x'});
            expect(result.scenarioFiles).to.deep.include({ filename: 'step.y.xml', filecontent: 'step.y'});
            expect(result.scenarioFiles).to.deep.include({ filename: 'step.z.txt', filecontent: 'step.z'});
        });

        test('can handle ../imports directory', () => {
            mockFs({
                'some/path': {
                    'imports': {
                        'acceptance.json': 'acceptance',
                        'test.json': 'test'
                    },
                    'track': {
                        'scenarios': {
                            'sample1': {
                                'input.txt': 'contents of input.txt',
                                'step.x.txt': 'contents of step.x.txt'
                            },
                            'sample2': { // these files should not be includes!
                                'input.txt': 'sample2 of input.txt',
                                'step.y.txt': 'sample2 of step.y.txt'
                            }
                        },
                        'my.integration.json': '{}',
                        'template.sbn': 'contents of template.sbn'
                    }
                }
            });

            const scene = { name: 'sample1', path: 'some/path/track/scenarios/sample1' };
            const ctx: Context = {
                activeFile: { filepath: 'no-file', filecontent: '' },
                integrationFilePath: 'some/path/track/my.integration.json',
                integrationFilename: 'my.integration.json',
                activeScenario: scene,
            };
            const result = FileScrambler.collectFiles(ctx, _noWorkspaceFile);

            assert.isNotNull(result);
            assert.equal(result.integrationFilePath, 'track/my.integration.json');

            assert.equal(result.files.length, 4);
            expect(result.files).to.deep.include({ filename: 'track/my.integration.json', filecontent: '{}' });
            expect(result.files).to.deep.include({ filename: 'track/template.sbn', filecontent: 'contents of template.sbn' });
            expect(result.files).to.deep.include({ filename: 'imports/acceptance.json', filecontent: 'acceptance' });
            expect(result.files).to.deep.include({ filename: 'imports/test.json', filecontent: 'test' });

            assert.equal(result.scenarioFiles.length, 2);
            assert.equal(result.scenarioFiles[0].filename, 'input.txt');
            assert.equal(result.scenarioFiles[0].filecontent, 'contents of input.txt');
            assert.equal(result.scenarioFiles[1].filename, 'step.x.txt');
            assert.equal(result.scenarioFiles[1].filecontent, 'contents of step.x.txt');
        });

        test('filecontent: first from activeFile', () => {
            mockFs(fileSystemStructure);
            const ctx: Context = {
                activeFile: { filepath: path.normalize('some/path/template.sbn'), filecontent: 'hi there' },
                integrationFilePath: 'some/path/my.integration.json',
                integrationFilename: 'my.integration.json',
                activeScenario: scenario,
            };
            const result = FileScrambler.collectFiles(ctx, _noWorkspaceFile);

            expect(result.files).to.deep.include({ filename: 'template.sbn', filecontent: 'hi there' });
        });

        test('filecontent: second from unsaved vscode file', () => {
            // simulate we have an unsaved change in vscode for input.txt
            mockFs(fileSystemStructure);
            context.activeScenario = scenario;
            const result = FileScrambler.collectFiles(context, (f) => {
                if (f === path.normalize('some/path/scenarios/sample1/input.txt')) { return 'wait whut'; }
                else { return; }
            });
            assert.equal(result.scenarioFiles[0].filecontent, 'wait whut');
        });

        test('filecontent: otherwise reads from filesystem', () => {
            mockFs(fileSystemStructure);
            const result = FileScrambler.collectFiles(context, _noWorkspaceFile);

            expect(result.files).to.deep.include({ filename: 'my.integration.json', filecontent: '{}' });
        });

        test('can handle AdditionalFiles from RenderTemplate step', () => {
            mockFs({
                'base/style.css': 'contents of style.css',
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
                    'my.integration.json': '{ "Steps": [ { "AdditionalFiles": ["../../base/style.css"] } ] }',
                    'template.sbn': 'contents of template.sbn'
                }
            });

            const scene: ScenarioSource = {
                name: 'sample1',
                path: 'some/path/scenarios/sample1'
            };
            const ctx: Context = {
                activeFile: { filepath: 'no-file', filecontent: '' },
                integrationFilePath: 'some/path/my.integration.json',
                integrationFilename: 'my.integration.json',
                activeScenario: scene,
            };
            const result = FileScrambler.collectFiles(ctx, _noWorkspaceFile);

            expect(result.files).to.deep.include({ filename: 'dir1/dir2/my.integration.json', filecontent: '{ "Steps": [ { "AdditionalFiles": ["../../base/style.css"] } ] }' });
            expect(result.files).to.deep.include({ filename: 'base/style.css', filecontent: 'contents of style.css' });
        });

    });

    suite('isValidScenario()', () => {

        const scenario: ScenarioSource = {
            name: 'sample1',
            path: 'some/path'
        };

        test('missing input.*', () => {
            mockFs({
                'some/path': {
                    'no-input.txt': 'nothing',
                    'step.x.txt': 'stepx'
                }
            });

            const isValidScenarioResult = FileScrambler.isValidScenario(scenario);
            assert.strictEqual(isValidScenarioResult, false);
        });
        
        test('with input.txt', () => {
            mockFs({
                'some/path': {
                    'input.txt': 'nothing'
                }
            });

            const isValidScenarioResult = FileScrambler.isValidScenario(scenario);
            assert.strictEqual(isValidScenarioResult, true);
        });

        test('with input.json', () => {
            mockFs({
                'some/path': {
                    'input.json': 'nothing'
                }
            });

            const isValidScenarioResult = FileScrambler.isValidScenario(scenario);
            assert.strictEqual(isValidScenarioResult, true);
        });

        test('with input.xml', () => {
            mockFs({
                'some/path': {
                    'input.xml': 'nothing',
                }
            });

            const isValidScenarioResult = FileScrambler.isValidScenario(scenario);
            assert.strictEqual(isValidScenarioResult, true);
        });
    });

    suite('getScenarios()', () => {

        const integrationFilePath = 'some/path/my.integration.json';

        test('no scenarios directory', () => {
            mockFs({
                'some/path': {
                    'my.integration.json': '{}'
                }
            });

            const result = FileScrambler.getScenarios(integrationFilePath);
            assert.strictEqual(result.success, false);
            assert.strictEqual(Object.keys(result.scenarios).length, 0);

        });

        test('a scenarios directory', () => {
            mockFs({
                'some/path': {
                    'my.integration.json': '{}',
                    'scenarios': {
                        'sample1': {}
                    }
                }
            });

            const result = FileScrambler.getScenarios(integrationFilePath);
            assert.strictEqual(result.success, true);
            assert.strictEqual(Object.keys(result.scenarios).length, 1);
            assert.strictEqual(result.scenarios['sample1'].name, 'sample1');
            assert.strictEqual(result.scenarios['sample1'].path, 'some/path/scenarios/sample1/');
        });

        test('multiple scenarios directory', () => {
            mockFs({
                'some/path': {
                    'my.integration.json': '{}',
                    'scenarios': {
                        'sample1': {},
                        'sample2': {}
                    }
                }
            });

            const result = FileScrambler.getScenarios(integrationFilePath);
            assert.strictEqual(result.success, true);
            assert.strictEqual(Object.keys(result.scenarios).length, 2);
            assert.strictEqual(result.scenarios['sample1'].name, 'sample1');
            assert.strictEqual(result.scenarios['sample1'].path, 'some/path/scenarios/sample1/');
            assert.strictEqual(result.scenarios['sample2'].name, 'sample2');
            assert.strictEqual(result.scenarios['sample2'].path, 'some/path/scenarios/sample2/');
        });

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
});
