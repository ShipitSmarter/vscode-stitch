import { expect } from "chai";
import { TreeBuilder } from "../../../TreeBuilder";
import { FormatModel } from "../../../types";

suite('TreeBuilder Tests', () => {
    suite('generateTree()', () => {

        test('no treeData return only root', () => {
            const treeData = {};
            const formatData: FormatModel = {
                format: 1,
                formattedInput: '',
                formattedJson: JSON.stringify(treeData),
            };
            const beginPath = 'Model';
            const result = TreeBuilder.generateTreeItemModel(formatData, beginPath);

            expect(result.name).to.equal(beginPath);
            expect(result.path).to.equal(beginPath);
            expect(result.children).undefined;
            expect(result.isCollection).undefined;
            expect(result.exampleValue).undefined;

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

            expect(result.isCollection).undefined;
            expect(result.exampleValue).undefined;
            const children = result.children!;
            expect(children.length).equal(3);
            expect(children[0]).deep.equal({ name: 'numeric', path: 'Model.numeric', exampleValue: '123' });
            expect(children[1]).deep.equal({ name: 'text', path: 'Model.text', exampleValue: 'abc' });
            expect(children[2]).deep.equal({ name: 'nothing', path: 'Model.nothing' });
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

            const textChild = result.children![0];

            expect(textChild.name).equal('texts');
            expect(textChild.path).equal('Model.texts');
            expect(textChild.isCollection).true;
            const children = textChild.children!;
            expect(children.length).equal(2);
            expect(children[0]).deep.equal({ name: '0', path: 'Model.texts[0]', exampleValue: 'option1' });
            expect(children[1]).deep.equal({ name: '1', path: 'Model.texts[1]', exampleValue: 'option2' });
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

            const textChild = result.children![0];
            expect(textChild.isCollection).true;
            expect(textChild.name).equal('objects');
            expect(textChild.path).equal('Model.objects');
            const children = textChild.children!;
            expect(children.length).equal(3);
            // the children get path x.{property} because when using these in scriban, they are used in a foreach (var x in collection)
            expect(children[0]).deep.equal({ name: 'simple', path: 'x.simple', exampleValue: 'simple1' });
            expect(children[1]).deep.equal({ name: 'prop', path: 'x.prop', exampleValue: 'prop1' });
            expect(children[2]).deep.equal({ name: 'other', path: 'x.other', exampleValue: 'a' });
        });

    });
});