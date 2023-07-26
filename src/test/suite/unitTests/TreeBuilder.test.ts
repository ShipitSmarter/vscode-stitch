import { fail } from "assert";
import * as chai from "chai";
import * as chaiSubset from "chai-subset";
import { TreeBuilder } from "../../../utils/TreeBuilder";

suite('TreeBuilder Tests', () => {
    chai.use(chaiSubset);

    suite('generateTreeItemInput()', () => {

        test('Model: simple property types, can be handled', () => {
            const treeData = {
                numeric: 123,
                text: 'abc',
                nothing: null
            };

            const children = TreeBuilder.generateTree(treeData);
            
            chai.expect(children.length).equal(3);
            chai.expect(children[0]).deep.equal({ name: 'numeric', path: 'numeric', exampleValue: '123' });
            chai.expect(children[1]).deep.equal({ name: 'text', path: 'text', exampleValue: 'abc' });
            chai.expect(children[2]).deep.equal({ name: 'nothing', path: 'nothing', exampleValue: 'null' });
        });

        test('Model: string array, adds items', () => {
            const treeData = {
                texts: [
                    'option1',
                    'option2'
                ]
            };
            
            const modelChildren = TreeBuilder.generateTree(treeData);

            chai.expect(modelChildren.length).equal(1);
            const textChild = modelChildren[0];

            chai.expect(textChild.name).equal('texts');
            chai.expect(textChild.path).equal('texts');
            chai.expect(textChild.isCollection).true;
            const children = textChild.children;
            if (!children) {
                fail();
            }
            chai.expect(children.length).equal(2);
            chai.expect(children[0]).deep.equal({ name: '0', path: 'texts[0]', exampleValue: 'option1' });
            chai.expect(children[1]).deep.equal({ name: '1', path: 'texts[1]', exampleValue: 'option2' });
        });

        test('Model: object array, adds properties of first item', () => {
            const treeData = {
                objects: [
                    { simple: 'simple1', prop: 'prop1', other: 'a' },
                    { simple: 'simple2', prop: 'prop2', other: 'b' },
                    { simple: 'simple3', prop: 'prop3', other: 'c' },
                ]
            };
            const modelChildren = TreeBuilder.generateTree(treeData);

            chai.expect(modelChildren.length).equal(1);
            const objChild = modelChildren[0];
            chai.expect(objChild.name).equal('objects');
            chai.expect(objChild.path).equal('objects');

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
    
    });
});
