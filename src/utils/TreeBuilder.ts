import { TreeItem } from "../types";

export class TreeBuilder {

    /* eslint-disable @typescript-eslint/no-explicit-any */
    public static generateTree(treeData: any): TreeItem[] {

        const tree: TreeItem = { name: 'dummy', path: '' };
        this._addNodes(tree, treeData);
        return tree.children ?? [];
    }

    private static _isNumber(n: string | number): boolean {
        return !isNaN(parseFloat(String(n))) && isFinite(Number(n));
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    private static _addNodes(parent: TreeItem, obj: any, overwriteExisting = false) {

        Object.keys(obj).forEach(key => {

            const childObj = obj[key];

            const child: TreeItem = {
                name: key,
                path: TreeBuilder._determinePath(parent, key)
            };

            if (!parent.children) {
                parent.children = [];
            }

            if(overwriteExisting && parent.children.find(c => c.name === child.name) !== undefined)
            {
                const existing = parent.children.find(c => c.name === child.name) as TreeItem;
                const index = parent.children.indexOf(existing);
                parent.children[index] = child;
            }
            else {
                parent.children.push(child);
            }

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

    private static _determinePath(parent: TreeItem, key: string): string {

        if (parent.isCollection) {
            return this._isNumber(key) ? `${parent.path}[${key}]` : `x.${key}`;
        }

        if (parent.path === '') {
            return key;
        }

        return this._useArrayIndexerForPath(key) ? `${parent.path}['${key}']` : `${parent.path}.${key}`;
    }
     

    private static _useArrayIndexerForPath(key: string): boolean {
        return key.indexOf('-') !== -1 ||
            key.indexOf(':') !== -1 ||
            key.indexOf(' ') !== -1 ||
            key.indexOf('@') !== -1 ||
            key.indexOf('#') !== -1;
    }
}
