import { fail } from "assert";
import * as chai from "chai";
import * as chaiSubset from "chai-subset";
import { CONSTANTS } from "../../../constants";
import { TreeBuilder } from "../../../utils/TreeBuilder";
import { TreeItem } from "../../../types";
import { DetectedModel } from "../../../types/apiTypes";

suite('TreeBuilder Tests', () => {
    chai.use(chaiSubset);

    suite('generateTreeItemInput()', () => {

        test('no treeData return Input root with Model and Request', () => {
            const treeData = {};
            const detectedModel: DetectedModel = {
                model: JSON.stringify(treeData)
            };
            const result = TreeBuilder.generateTreeItemInput(detectedModel);

            chai.expect(result.name).to.equal('Input');
            chai.expect(result.path).to.equal('');
            chai.expect(result.isCollection).undefined;
            chai.expect(result.exampleValue).undefined;

            const children = result.children;
            if (!children){
                fail('Input should have children');
            }
            chai.expect(children.length).equal(2);
            chai.expect(children[0].name).equal('Model');
            chai.expect(children[0].path).equal('Model');
            chai.expect(children[0].children).undefined;

            chai.expect(children[1].name).equal('Request');
            chai.expect(children[1].path).equal('Request');
            const reqChildren = children[1].children;
            if (!reqChildren)
            {
                fail('Request should have children');
            }
            
            chai.expect(reqChildren.length).equal(5);
            chai.expect(reqChildren[0]).deep.equal({ name: 'Method', path: 'Request.Method', exampleValue: 'null'});
            chai.expect(reqChildren[1]).deep.equal({ name: 'Headers', path: 'Request.Headers', exampleValue: 'null'});
            chai.expect(reqChildren[2]).deep.equal({ name: 'Query', path: 'Request.Query', exampleValue: 'null'});
        });

        test('Request: taken from input.httpRequest', () => {

            /* eslint-disable @typescript-eslint/naming-convention */
            const detectedModel: DetectedModel = {
                model:JSON.stringify({}),
                httpRequest: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Custom': 'testing'
                    },
                    query: {
                        'property-with-dash': ['5'],
                        'propertyWithoutDash': ['4']
                    },
                    queryString: { 'a': 'b' },
                    route: { 'a': 'b' },
                }
            };
            /* eslint-enable @typescript-eslint/naming-convention */

            const result = TreeBuilder.generateTreeItemInput(detectedModel);
            const children = result.children;
            if (!children){
                fail('Input should have children');
            }
            chai.expect(children.length).equal(2);

            chai.expect(children[1].name).equal('Request');
            chai.expect(children[1].path).equal('Request');
            const reqChildren = children[1].children;
            if (!reqChildren)
            {
                fail('Request should have children');
            }
            
            // Reuqest.Method
            chai.expect(reqChildren.length).equal(5);
            chai.expect(reqChildren[0]).deep.equal({ name: 'Method', path: 'Request.Method', exampleValue: 'POST'});

            // Request.Headers
            chai.expect(reqChildren[1].name).equal('Headers');
            chai.expect(reqChildren[1].path).equal('Request.Headers');
            const headerChildren = reqChildren[1].children;
            if (!headerChildren){
                fail('Headers should have children');
            }
            chai.expect(headerChildren.length).equal(2);
            chai.expect(headerChildren[0]).deep.equal({ name: 'Content-Type', path: "Request.Headers['Content-Type']", exampleValue: 'application/json'});
            chai.expect(headerChildren[1]).deep.equal({ name: 'Custom', path: 'Request.Headers.Custom', exampleValue: 'testing'});

            // Request.Query
            chai.expect(reqChildren[2].name).equal('Query');
            chai.expect(reqChildren[2].path).equal('Request.Query');
            const queryChildren = reqChildren[2].children;
            if (!queryChildren) {
                fail('Query should have children');
            }
            chai.expect(queryChildren.length).equal(2);
            chai.expect(queryChildren[0].name).equal('property-with-dash');
            chai.expect(queryChildren[0].path).equal("Request.Query['property-with-dash']");
            chai.expect(queryChildren[0].isCollection).equal(true);
            chai.expect(queryChildren[1].name).equal('propertyWithoutDash');
            chai.expect(queryChildren[1].path).equal("Request.Query.propertyWithoutDash");
            chai.expect(queryChildren[1].isCollection).equal(true);
        });

        test('Model: simple property types, can be handled', () => {
            const treeData = {
                numeric: 123,
                text: 'abc',
                nothing: null
            };

            const children = _getModelChildren(treeData);
            
            chai.expect(children.length).equal(3);
            chai.expect(children[0]).deep.equal({ name: 'numeric', path: 'Model.numeric', exampleValue: '123' });
            chai.expect(children[1]).deep.equal({ name: 'text', path: 'Model.text', exampleValue: 'abc' });
            chai.expect(children[2]).deep.equal({ name: 'nothing', path: 'Model.nothing', exampleValue: 'null' });
        });

        test('Model: string array, adds items', () => {
            const treeData = {
                texts: [
                    'option1',
                    'option2'
                ]
            };
            
            const modelChildren = _getModelChildren(treeData);

            chai.expect(modelChildren.length).equal(1);
            const textChild = modelChildren[0];

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

        test('Model: object array, adds properties of first item', () => {
            const treeData = {
                objects: [
                    { simple: 'simple1', prop: 'prop1', other: 'a' },
                    { simple: 'simple2', prop: 'prop2', other: 'b' },
                    { simple: 'simple3', prop: 'prop3', other: 'c' },
                ]
            };
            const modelChildren = _getModelChildren(treeData);

            chai.expect(modelChildren.length).equal(1);
            const objChild = modelChildren[0];
            chai.expect(objChild.name).equal('objects');
            chai.expect(objChild.path).equal('Model.objects');

            const children = objChild.children;
            if (!children) {
                fail();
            }
            chai.expect(children.length).equal(3);
            // the children get path x.{property} because when using these in scriban, they are used in a foreach (var x in collection)
            chai.expect(children[0]).deep.equal({ name: 'simple', path: 'x.simple', exampleValue: 'simple1' });
            chai.expect(children[1]).deep.equal({ name: 'prop', path: 'x.prop', exampleValue: 'prop1' });
            chai.expect(children[2]).deep.equal({ name: 'other', path: 'x.other', exampleValue: 'a' });
        });

        // Helpers

        function _getModelChildren(treeData: unknown): TreeItem[] {            
            const detectedModel: DetectedModel = {
                model: JSON.stringify(treeData)
            };
            const result = TreeBuilder.generateTreeItemInput(detectedModel);

            chai.expect(result.isCollection).undefined;
            chai.expect(result.exampleValue).undefined;

            const inputChildren = result.children;
            if (!inputChildren){
                fail('Input should have children');
            }
            const model = inputChildren[0];
            if (!model) {
                fail();
            }

            const children = model.children;
            if (!children){
                fail('Model should have children');
            }
            return children;
        } 
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
            
            const result = TreeBuilder.generateTreeItemStep(stepId, stepType, <DetectedModel>{ 
                model: `{
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
