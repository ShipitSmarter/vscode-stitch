import { CONSTANTS } from "./constants";
import { FormatModel, TreeItem } from "./types";

export class TreeBuilder {

    public static generateTreeItemModel(treeData: FormatModel, beginPath: string): TreeItem {

        const tree: TreeItem = { name: beginPath, path: beginPath };
        if (!treeData) {
            return tree;
        }

        this._addNodes(tree, JSON.parse(treeData.formattedJson));

        return tree;
    }

    public static generateTreeItemStep(stepId: string, stepType: string, responseData: FormatModel): TreeItem {

        const path = `Steps.${stepId}`;
        const tree: TreeItem = { name: path, path };

        /* eslint-disable @typescript-eslint/naming-convention */
        const obj: StepResultAggregate = {
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
                    obj.Model = <Record<string, unknown>>JSON.parse(responseData.formattedJson);
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

    private static _isNumber(n: string | number): boolean {
        return !isNaN(parseFloat(String(n))) && isFinite(Number(n));
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    private static _addNodes(parent: TreeItem, obj: any) {

        Object.keys(obj).forEach(key => {

            const child: TreeItem = {
                name: key,
                path: parent.isCollection
                    ? this._isNumber(key)
                        ? `${parent.path}[${key}]` : `x.${key}`
                    : `${parent.path}.${key}`
            };
            const childObj = obj[key];

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
    /* eslint-enable @typescript-eslint/no-explicit-any */
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    /* eslint-enable @typescript-eslint/no-unsafe-call */
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
}

/* eslint-disable @typescript-eslint/naming-convention */
interface StepResultAggregate {
    HasStartCondition: boolean;
    HasSuccessCondition: boolean;
    Success: boolean;
    Started: boolean | null;

    Response?: StepResultHttpResponse | StepResultRenderResponse;
    Model?: Record<string, unknown>;
}

interface StepResultHttpResponse {
    BodyFormat: string;
    StatusCode: number;
    IsSuccessStatusCode: boolean;
}

interface StepResultRenderResponse {
    Content: string;
    ContentType: string;
    StatusCode: number;
    IsSuccessStatusCode: boolean;
    ErrorMessage: string;
}
/* eslint-enable @typescript-eslint/naming-convention */