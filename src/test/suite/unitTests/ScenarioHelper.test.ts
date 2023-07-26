/* eslint-disable @typescript-eslint/naming-convention */
import * as mockFs from 'mock-fs'; // must be first!

import { assert } from 'chai';
import { ScenarioSource } from '../../../types';
import { ScenarioHelper } from '../../../utils/ScenarioHelper';

suite('ScenarioHelper Tests', () => {

    suiteTeardown(() => {
        mockFs.restore();
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

            const isValidScenarioResult = ScenarioHelper.isValidScenario(scenario);
            assert.strictEqual(isValidScenarioResult, false);
        });
        
        test('with input.txt', () => {
            mockFs({
                'some/path': {
                    'input.txt': 'nothing'
                }
            });

            const isValidScenarioResult = ScenarioHelper.isValidScenario(scenario);
            assert.strictEqual(isValidScenarioResult, true);
        });

        test('with input.json', () => {
            mockFs({
                'some/path': {
                    'input.json': 'nothing'
                }
            });

            const isValidScenarioResult = ScenarioHelper.isValidScenario(scenario);
            assert.strictEqual(isValidScenarioResult, true);
        });

        test('with input.xml', () => {
            mockFs({
                'some/path': {
                    'input.xml': 'nothing',
                }
            });

            const isValidScenarioResult = ScenarioHelper.isValidScenario(scenario);
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

            const result = ScenarioHelper.getScenarios(integrationFilePath);
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

            const result = ScenarioHelper.getScenarios(integrationFilePath);
            assert.strictEqual(result.success, true);
            assert.strictEqual(Object.keys(result.scenarios).length, 1);
            assert.strictEqual(result.scenarios['sample1'].name, 'sample1');
            assert.strictEqual(result.scenarios['sample1'].path, 'some/path/scenarios/sample1');
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

            const result = ScenarioHelper.getScenarios(integrationFilePath);
            assert.strictEqual(result.success, true);
            assert.strictEqual(Object.keys(result.scenarios).length, 2);
            assert.strictEqual(result.scenarios['sample1'].name, 'sample1');
            assert.strictEqual(result.scenarios['sample1'].path, 'some/path/scenarios/sample1');
            assert.strictEqual(result.scenarios['sample2'].name, 'sample2');
            assert.strictEqual(result.scenarios['sample2'].path, 'some/path/scenarios/sample2');
        });

    });
    
});
