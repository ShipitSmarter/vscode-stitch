import { CONSTANTS } from "./constants";
import { FormatModel, TreeItem } from "./types";

export class TreeBuilder {

    public static generateTreeItemModel(treeData: FormatModel, beginPath: string): TreeItem {

        let tree: TreeItem = { name: beginPath, path: beginPath };
        if (!treeData) {
            return tree;
        }

        this._addNodes(tree, JSON.parse(treeData.formattedJson));

        return tree;
    }

    public static generateTreeItemStep(stepId: string, stepType: string, responseData: FormatModel): TreeItem {

        const path = `Steps.${stepId}`;
        let tree: TreeItem = { name: path, path };

        /* eslint-disable @typescript-eslint/naming-convention */
        let obj: any = {
            HasStartCondition: false,
                HasSuccessCondition: false,
                Success: true,
                Started: null,
        };

        switch(stepType) {
            case CONSTANTS.httpStepConfigurationType:
                obj.Response = {
                    BodyFormat: 'json',
                    StatusCode: 0,
                    IsSuccessStatusCode: true
                };
                if (responseData?.formattedJson) {
                    obj.Model = JSON.parse(responseData.formattedJson);
                }
                break;
            case CONSTANTS.renderTemplateStepConfigurationType:
                obj.Response = {
                    Content: 'base64',
                    ContentType: 'application/pdf',
                    StatusCode: 200,
                    IsSuccessStatusCode: true,
                    ErrorMessage: ''
                };
                break;
            default:
                break;
        }
        /* eslint-enable @typescript-eslint/naming-convention */

        this._addNodes(tree, obj);
        return tree;
    }

    static _isNumber(n: string | number): boolean {
        return !isNaN(parseFloat(String(n))) && isFinite(Number(n));
    }

    static _addNodes(parent: TreeItem, obj: any) {

        Object.keys(obj).forEach(key => {

            let child: TreeItem = {
                name: key,
                path: parent.isCollection
                    ? this._isNumber(key)
                        ? `${parent.path}[${key}]` : `x.${key}`
                    : `${parent.path}.${key}`
            };
            let childObj = obj[key];

            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(child);
            if (!childObj) { return; }

            if (typeof childObj === 'object') {
                if (Array.isArray(childObj) && childObj.length > 0) {
                    child.isCollection = true;
                    if (typeof childObj[0] === 'object') {
                        // if the first item is an object, 
                        // we expect all children to be te same and we render only the properties of the first child!
                        this._addNodes(child, childObj[0]);
                    } else {
                        // it is an simple object like a string array
                        this._addNodes(child, childObj);
                    }
                } else {
                    this._addNodes(child, childObj);
                }
            } else {
                child.exampleValue = childObj.toString();
            }
        });
    }

}
