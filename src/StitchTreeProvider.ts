import * as vscode from 'vscode';
import * as path from 'path';
import { COMMANDS } from './constants';
import { ContextHandler } from './ContextHandler';
import { TreeBuilder } from './TreeBuilder';
import { HttpStepResult, TreeItem } from './types';
import { FileScrambler } from './FileScrambler';

const rootPathRegex = /^(Model|Steps.([a-zA-Z0-9_-]+).Model)$/;

export class StitchTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this._onDidChangeTreeData.event;

    private tree: TreeItem[] | undefined;
    
    constructor(context: vscode.ExtensionContext) {
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        
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
        treeItem.contextValue = element.path.match(rootPathRegex) && element.children ? 'SCENARIO_FILE' : undefined;
        return treeItem;
    }
    
    getChildren(element?: TreeItem): vscode.ProviderResult<TreeItem[]> {
        if (element) {
            return Promise.resolve(element.children);
        } else {
            return Promise.resolve(this.tree);
        }
    }
    
    public insertProperty(item: TreeItem) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        
        const insertText = this._getInsertText(item);
        editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, insertText);
        });
    }

    public refresh() {
        this.tree = this._buildTree();
        this._onDidChangeTreeData.fire(null);
	}

    public static async openScenarioFile(treeItem: TreeItem): Promise<void> {
        const scenario = ContextHandler.getContext()?.activeScenario;
        if (!scenario) { return; }

        if (treeItem.path === 'Model') {
            const inputPath = FileScrambler.getScenarioInputFilepath(scenario);
            const uri = vscode.Uri.file(inputPath);
            await vscode.window.showTextDocument(uri);
            return;
        }

        const match = treeItem.path.match(/Steps.([a-zA-Z0-9_-]+).Model/);
        const stepName = match && match[1];
        if (stepName) {
            const stepPath = FileScrambler.getScenarioStepFilepath(scenario, stepName);
            const uri = vscode.Uri.file(stepPath);
            await vscode.window.showTextDocument(uri);
        }
    }

    private _buildTree(): TreeItem[] | undefined {
    
        const currentResponse = ContextHandler.getPreviewResponse();
        if (!currentResponse) {
            return;
        }

        const ctx = currentResponse.integrationContext;
        return [
            TreeBuilder.generateTree(ctx.model, "Model"),
            ...Object.keys(ctx.steps).map(stepId => TreeBuilder.generateTree((ctx.steps[stepId] as HttpStepResult)?.model, `Steps.${stepId}.Model`))
        ];
    }

    _getInsertText(item: TreeItem) : string {
        if (item.isCollection && item.children) {
            return `{{ for x in ${item.path} }}
    {{ x.${item.children[0].name} }} 
{{ end }}`;
        }
        return `{{${item.path}}}`;
    }

    _getLabel(item: TreeItem) : string {
        return item.isCollection ? `${item.name} []` : item.name;
    }

}
