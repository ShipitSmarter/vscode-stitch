import * as vscode from 'vscode';
import { COMMANDS, CONSTANTS } from './constants';
import { ContextHandler } from './ContextHandler';
import { TreeBuilder } from './TreeBuilder';
import { FormatModel, TreeItem } from './types';
import { FileScrambler } from './FileScrambler';
import axios, { AxiosResponse } from 'axios';

const rootPathRegex = /^(Model|Steps.([a-zA-Z0-9_-]+).Model)$/;

export class StitchTreeProvider implements vscode.TreeDataProvider<TreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this._onDidChangeTreeData.event;

    private _endpointUrl: string; 
    private tree: TreeItem[] = [];

    constructor() {
        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        this._endpointUrl = `${endpoint}/editor/model`;
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
        } else if (this.tree.length) {
            return Promise.resolve(this.tree);
        } else {
            return this._fetchTreeItems();
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
        this._fetchTreeItems()
            ?.then(treeItems => {
                this.tree = treeItems;
                this._onDidChangeTreeData.fire(null);
            })
            .catch(err => vscode.window.showErrorMessage(`Could not update tree: ${err.message}`));
    }

    private _fetchTreeItems() {
        const context = ContextHandler.getContext();
        if (!context) {
            return Promise.resolve([]);
        }

        const files = FileScrambler.getScenarioFiles(context);

        var requests = [];
        var steps = FileScrambler.getStepTypes(context);
        for(let file of files) {
            if (file.filename.startsWith('step')) {
                let stepId = file.filename.split('.')[1];
                requests.push(axios.post(this._endpointUrl, { file })
                    .then((res: AxiosResponse<FormatModel>) => { return TreeBuilder.generateTreeItemStep(stepId, steps[stepId], res.data); })
                );
            }
            else {
                requests.push(axios.post(this._endpointUrl, { file })
                    .then((res: AxiosResponse<FormatModel>) => { return TreeBuilder.generateTreeItemModel(res.data, 'Model'); })
                );
            }
        }

        return Promise.all(requests);
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
