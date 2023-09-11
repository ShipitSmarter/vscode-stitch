import * as vscode from 'vscode';
import { COMMANDS } from './constants';
import { ContextHandler } from './ContextHandler';
import { TreeItem } from './types';
import { delay } from './utils/helpers';
import { ScenarioHelper } from './utils/ScenarioHelper';

const rootPathRegex = /^(Model|Steps.([a-zA-Z0-9_-]+).Model)$/;
const stepPathRegex = /Steps.([a-zA-Z0-9_-]+).Model/;

export class StitchTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    

    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>();
    public readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this._onDidChangeTreeData.event;

    private _tree: TreeItem[] = [];

    public static async openScenarioFile(treeItem: TreeItem): Promise<void> {
        const scenario = ContextHandler.getContext()?.activeScenario;
        if (!scenario) { return; }

        if (treeItem.path === 'Model') {
            const inputPath = ScenarioHelper.getScenarioInputFilepath(scenario);
            const uri = vscode.Uri.file(inputPath);
            await vscode.window.showTextDocument(uri);
            return;
        }

        if (treeItem.path === 'Configuration') {
            const inputPath = ScenarioHelper.getScenarioConfigFilepath(scenario);
            const uri = vscode.Uri.file(inputPath);
            await vscode.window.showTextDocument(uri);
            return;
        }

        const match = stepPathRegex.exec(treeItem.path);
        const stepName = match && match[1];
        if (stepName) {
            const stepPath = ScenarioHelper.getScenarioStepFilepath(scenario, stepName);
            const uri = vscode.Uri.file(stepPath);
            await vscode.window.showTextDocument(uri);
        }
    }

    public getTreeItem(element: TreeItem): vscode.TreeItem {
        const collapsible = element.children && element.children.length;
        const treeItem: vscode.TreeItem = new vscode.TreeItem(
            this._getLabel(element), 
            collapsible ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        );
        treeItem.command = {
            command: COMMANDS.insertModelProperty,
            title: '',
            arguments: [element]
        };
        treeItem.description = element.exampleValue;
        treeItem.contextValue = rootPathRegex.exec(element.path) && element.children ? 'SCENARIO_FILE' : undefined;
        return treeItem;
    }

    public getChildren(element?: TreeItem): vscode.ProviderResult<TreeItem[]> {
        if (element) {
            return Promise.resolve(element.children);
        } else if (this._tree.length) {
            return Promise.resolve(this._tree);
        } else {
            ContextHandler.requestSimulationResult(); // this will call setTree one the request comes back
            return Promise.resolve([]);
        }
    }

    public clear() {
        this._tree = [];
        this._onDidChangeTreeData.fire(null);
    }
    
    public setTree(items: TreeItem[]): void{ 
        this._tree = items;
        this._onDidChangeTreeData.fire(null);
    }

    public async getFirstRoot(): Promise<TreeItem> {
        // delay for a bit, because context might be updating
        await delay(200);

        return this._tree[0];
    }

    public getParent(): vscode.ProviderResult<TreeItem> {
        return Promise.resolve(undefined);
    }

    public insertProperty(item: TreeItem): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        
        const isWithinScribanBlock = this._isWithinScribanCodeBlock(editor);

        const insertText = isWithinScribanBlock 
            ? this._getInsertTextInsideScribanBlock(item) 
            : this._getInsertTextOutsideScribanBlock(item);
        void editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, insertText);
        });
    }

    private _isWithinScribanCodeBlock(editor: vscode.TextEditor): boolean {
        const startOffset = editor.document.offsetAt(editor.selection.start);
        const beforeText = editor.document.getText().substring(0, startOffset);
        const openBlockOffset = beforeText.lastIndexOf('{{');
        const closeBlockOffset = beforeText.lastIndexOf('}}');
        if (openBlockOffset > closeBlockOffset) {
            return true;
        }
        return false;
    }

    private _getInsertTextOutsideScribanBlock(item: TreeItem) : string {
        if (item.isCollection && item.children) {
            return `{{ for x in ${item.path} }}
    {{ x.${item.children[0].name} }}
{{ end }}`;
        }
        return `{{${item.path}}}`;
    }

    private _getInsertTextInsideScribanBlock(item: TreeItem) : string {
        if (item.isCollection && item.children) {
            return `for x in ${item.path}
    x.${item.children[0].name}
end`;
        }
        return `${item.path}`;
    }

    private _getLabel(item: TreeItem) : string {
        return item.isCollection ? `${item.name} []` : item.name;
    }
}
