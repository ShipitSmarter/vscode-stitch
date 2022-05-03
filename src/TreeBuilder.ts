import { CONSTANTS } from "./constants";
import { DetectedModel, ErrorData, TreeItem } from "./types";

export class TreeBuilder {

    public static generateTreeItemInput(treeData: DetectedModel): TreeItem {

        const tree: TreeItem = { name: 'Input', path: '' };

        /* eslint-disable @typescript-eslint/naming-convention */
        if (treeData) {
            const obj: InputRequest = {
                Model: <Record<string, unknown>>JSON.parse(treeData.model || '"ERROR"'),
                Request: {
                    Method: treeData.httpRequest?.method,
                    Headers: treeData.httpRequest?.headers,
                    Query: treeData.httpRequest?.query,
                }
            };
            this._addNodes(tree, obj);
        }
        /* eslint-enable @typescript-eslint/naming-convention */

        return tree;
    }

    public static generateTreeItemStep(stepId: string, stepType: string, responseData?: DetectedModel | ErrorData): TreeItem {

        const path = `Steps.${stepId}`;
        const tree: TreeItem = { name: path, path };

        /* eslint-disable @typescript-eslint/naming-convention */
        const obj: StepResultAggregate = {
            HasStartCondition: false,
            HasSuccessCondition: false,
            Success: true,
            Started: null,
        };

        switch (stepType) {
            case CONSTANTS.httpStepConfigurationType:
                {
                    obj.Response = {
                        BodyFormat: 'json',
                        StatusCode: 0,
                        IsSuccessStatusCode: true
                    };
                    if (responseData && 'model' in responseData) {
                        obj.Model = <Record<string, unknown>>JSON.parse(responseData.model);
                    }
                    else if (responseData && 'StackTraceString' in responseData) {
                        obj.Model = <Record<string, unknown>>JSON.parse('"ERROR"');
                    }
                    break;
                }
            case CONSTANTS.renderTemplateStepConfigurationType:
                {
                    obj.Response = {
                        Content: 'base64',
                        ContentType: 'application/pdf',
                        StatusCode: 200,
                        IsSuccessStatusCode: true,
                        ErrorMessage: ''
                    };
                    break;
                }
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

            const childObj = obj[key];

            const child: TreeItem = {
                name: key,
                path: TreeBuilder._determinePath(parent, key)
            };

            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(child);

            if (childObj === undefined || childObj === null) {
                child.exampleValue = 'null';
                return;
            }

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

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private static _determinePath(parent: TreeItem, key: string): string {

        if (parent.isCollection) {
            return this._isNumber(key) ? `${parent.path}[${key}]` : `x.${key}`;
        }

        if (parent.path === '') {
            return key;
        }

        return this._useArrayIndexerForPath(key) ? `${parent.path}['${key}']` : `${parent.path}.${key}`;
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    private static _useArrayIndexerForPath(key: string): boolean {
        return key.indexOf('-') !== -1 ||
            key.indexOf(':') !== -1 ||
            key.indexOf('@') !== -1 ||
            key.indexOf('#') !== -1;
    }
}

/* eslint-disable @typescript-eslint/naming-convention */
interface InputRequest {
    Model: Record<string, unknown>;
    Request: {
        Method?: string;
        Headers?: Record<string, string>;
        Query?: Record<string, string[]>;
    }
}

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