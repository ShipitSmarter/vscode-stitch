import { fail } from "assert";
import * as chai from "chai";
import * as chaiSubset from "chai-subset";
import { CONSTANTS } from "../../../constants";
import { TreeBuilder } from "../../../TreeBuilder";
import { Format, FormatModel, TreeItem } from "../../../types";

suite('TreeBuilder Tests', () => {
    chai.use(chaiSubset);

    suite('generateTreeItemModel()', () => {

        test('no treeData return only root', () => {
            const treeData = {};
            const formatData: FormatModel = {
                format: 1,
                formattedInput: '',
                formattedJson: JSON.stringify(treeData),
            };
            const beginPath = 'Model';
            const result = TreeBuilder.generateTreeItemModel(formatData, beginPath);

            chai.expect(result.name).to.equal(beginPath);
            chai.expect(result.path).to.equal(beginPath);
            chai.expect(result.children).undefined;
            chai.expect(result.isCollection).undefined;
            chai.expect(result.exampleValue).undefined;

        });

        test('simple property types, can be handled', () => {
            const treeData = {
                numeric: 123,
                text: 'abc',
                nothing: null
            };
            const formatData: FormatModel = {
                format: 1,
                formattedInput: '',
                formattedJson: JSON.stringify(treeData),
            };
            const beginPath = 'Model';
            const result = TreeBuilder.generateTreeItemModel(formatData, beginPath);

            chai.expect(result.isCollection).undefined;
            chai.expect(result.exampleValue).undefined;
            const children = result.children;
            if (!children) {
                fail();
            }
            chai.expect(children.length).equal(3);
            chai.expect(children[0]).deep.equal({ name: 'numeric', path: 'Model.numeric', exampleValue: '123' });
            chai.expect(children[1]).deep.equal({ name: 'text', path: 'Model.text', exampleValue: 'abc' });
            chai.expect(children[2]).deep.equal({ name: 'nothing', path: 'Model.nothing', exampleValue: 'null' });
        });

        test('string array, adds items', () => {
            const treeData = {
                texts: [
                    'option1',
                    'option2'
                ]
            };
            const formatData: FormatModel = {
                format: 1,
                formattedInput: '',
                formattedJson: JSON.stringify(treeData),
            };
            const beginPath = 'Model';
            const result = TreeBuilder.generateTreeItemModel(formatData, beginPath);

            if (!result.children) {
                fail();
            }
            const textChild = result.children[0];

            chai.expect(textChild.name).equal('texts');
            chai.expect(textChild.path).equal('Model.texts');
            chai.expect(textChild.isCollection).true;
            const children = textChild.children;
            if (!children) {
                fail();
            }
            chai.expect(children.length).equal(2);
            chai.expect(children[0]).deep.equal({ name: '0', path: 'Model.texts[0]', exampleValue: 'option1' });
            chai.expect(children[1]).deep.equal({ name: '1', path: 'Model.texts[1]', exampleValue: 'option2' });
        });

        test('object array, adds properties of first item', () => {
            const treeData = {
                objects: [
                    { simple: 'simple1', prop: 'prop1', other: 'a' },
                    { simple: 'simple2', prop: 'prop2', other: 'b' },
                    { simple: 'simple3', prop: 'prop3', other: 'c' },
                ]
            };
            const formatData: FormatModel = {
                format: 1,
                formattedInput: '',
                formattedJson: JSON.stringify(treeData),
            };
            const beginPath = 'Model';
            const result = TreeBuilder.generateTreeItemModel(formatData, beginPath);

            if (!result.children) {
                fail();
            }
            const textChild = result.children[0];
            chai.expect(textChild.isCollection).true;
            chai.expect(textChild.name).equal('objects');
            chai.expect(textChild.path).equal('Model.objects');
            const children = textChild.children;
            if (!children) {
                fail();
            }
            chai.expect(children.length).equal(3);
            // the children get path x.{property} because when using these in scriban, they are used in a foreach (var x in collection)
            chai.expect(children[0]).deep.equal({ name: 'simple', path: 'x.simple', exampleValue: 'simple1' });
            chai.expect(children[1]).deep.equal({ name: 'prop', path: 'x.prop', exampleValue: 'prop1' });
            chai.expect(children[2]).deep.equal({ name: 'other', path: 'x.other', exampleValue: 'a' });
        });
    });

    suite('generateTreeItemStep()', () => {

        function _assertStepBase(treeRoot: TreeItem, expectedStepId: string) {
            if (!treeRoot.children) {
                fail();
            }

            const stepPath = `Steps.${expectedStepId}`;
            chai.expect(treeRoot.name).to.equal(stepPath);
            chai.expect(treeRoot.path).to.equal(stepPath);
            chai.expect(treeRoot.children[0]).to.deep.equal({ name: 'HasStartCondition', path: `${stepPath}.HasStartCondition`, exampleValue: 'false' });
            chai.expect(treeRoot.children[1]).to.deep.equal({ name: 'HasSuccessCondition', path: `${stepPath}.HasSuccessCondition`, exampleValue: 'false' });
            chai.expect(treeRoot.children[2]).to.deep.equal({ name: 'Success', path: `${stepPath}.Success`, exampleValue: 'true' });
            chai.expect(treeRoot.children[3]).to.deep.equal({ name: 'Started', path: `${stepPath}.Started`, exampleValue: 'null' });
        }

        test('Default steps created successfully', () => {
            const stepId = 'TestStep';
            const stepType = 'GoesToDefaultFallback';
            
            const result = TreeBuilder.generateTreeItemStep(stepId, stepType, undefined);

            if (!result.children) {
                fail();
            }
            _assertStepBase(result, stepId);
        });

        test('Http type step without response data created successfully', () => {
            const stepId = 'TestStep';
            const stepType = CONSTANTS.httpStepConfigurationType;
            
            const result = TreeBuilder.generateTreeItemStep(stepId, stepType, undefined);

            if (!result.children) {
                fail();
            }
            chai.expect(result.children.length).to.equal(5); // Base (4) + Response
            _assertStepBase(result, stepId);
            const responseChild = result.children[4];
            if (!responseChild.children) {
                fail();
            }
            const responsePath = `Steps.${stepId}.Response`;
            chai.expect(responseChild.children[0]).to.deep.equal({ name: 'BodyFormat', path: `${responsePath}.BodyFormat`, exampleValue: 'json' });
            chai.expect(responseChild.children[1]).to.deep.equal({ name: 'StatusCode', path: `${responsePath}.StatusCode`, exampleValue: '0' });
            chai.expect(responseChild.children[2]).to.deep.equal({ name: 'IsSuccessStatusCode', path: `${responsePath}.IsSuccessStatusCode`, exampleValue: 'true' });
        });

        test('Http type step with response data created successfully', () => {
            const stepId = 'TestStep';
            const stepType = CONSTANTS.httpStepConfigurationType;
            
            const result = TreeBuilder.generateTreeItemStep(stepId, stepType, { 
                format: Format.json, formattedInput: '',
                formattedJson: `{
                    "testProp1": "value1",
                    "testObj1": {
                        "testSubProp1": "value2"
                    },
                    "testList1": [
                        "value3"
                    ]
                }`
            });

            if (!result.children) {
                fail();
            }
            chai.expect(result.children.length).to.equal(6); // Base (4) + Response + Model
            _assertStepBase(result, stepId);
            const modelChild = result.children[5];
            if (!modelChild.children) {
                fail();
            }
            const modelPath = `Steps.${stepId}.Model`;
            chai.expect(modelChild.children[0]).to.deep.equal({ name: 'testProp1', path: `${modelPath}.testProp1`, exampleValue: 'value1' });
            
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            chai.expect(modelChild.children[1]).to.containSubset({ name: 'testObj1', path: `${modelPath}.testObj1` });
            chai.expect(modelChild.children[1].children?.length).to.equal(1);
            
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            chai.expect(modelChild.children[2]).to.containSubset({ name: 'testList1', path: `${modelPath}.testList1`, isCollection: true });
            chai.expect(modelChild.children[2].children?.length).to.equal(1);
        });

        test('RenderTemplate type step created successfully', () => {
            const stepId = 'TestStep';
            const stepType = CONSTANTS.renderTemplateStepConfigurationType;
            
            const result = TreeBuilder.generateTreeItemStep(stepId, stepType, undefined);

            if (!result.children) {
                fail();
            }
            chai.expect(result.children.length).to.equal(5); // Base (4) + Response
            _assertStepBase(result, stepId);
            const responseChild = result.children[4];
            if (!responseChild.children) {
                fail();
            }
            const responsePath = `Steps.${stepId}.Response`;
            chai.expect(responseChild.children[0]).to.deep.equal({ name: 'Content', path: `${responsePath}.Content`, exampleValue: 'base64' });
            chai.expect(responseChild.children[1]).to.deep.equal({ name: 'ContentType', path: `${responsePath}.ContentType`, exampleValue: 'application/pdf' });
            chai.expect(responseChild.children[2]).to.deep.equal({ name: 'StatusCode', path: `${responsePath}.StatusCode`, exampleValue: '200' });
            chai.expect(responseChild.children[3]).to.deep.equal({ name: 'IsSuccessStatusCode', path: `${responsePath}.IsSuccessStatusCode`, exampleValue: 'true' });
            chai.expect(responseChild.children[4]).to.deep.equal({ name: 'ErrorMessage', path: `${responsePath}.ErrorMessage`, exampleValue: '' });
        });
    });
});
