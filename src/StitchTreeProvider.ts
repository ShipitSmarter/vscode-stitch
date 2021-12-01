import * as vscode from 'vscode';
import { COMMANDS, CONSTANTS } from './constants';
import { ContextHandler } from './ContextHandler';
import { TreeBuilder } from './TreeBuilder';
import { FormatModel, TreeItem } from './types';
import { FileScrambler } from './FileScrambler';
import axios, { AxiosResponse } from 'axios';

const rootPathRegex = /^(Model|Steps.([a-zA-Z0-9_-]+).Model)$/;
const stepPathRegex = /Steps.([a-zA-Z0-9_-]+).Model/;

export class StitchTreeProvider implements vscode.TreeDataProvider<TreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>();
    public readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this._onDidChangeTreeData.event;

    private _endpointUrl: string; 
    private _tree: TreeItem[] = [];

    public constructor() {
        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        this._endpointUrl = `${endpoint}/editor/model`;
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

        const match = stepPathRegex.exec(treeItem.path);
        const stepName = match && match[1];
        if (stepName) {
            const stepPath = FileScrambler.getScenarioStepFilepath(scenario, stepName);
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
            return this._fetchTreeItems();
        }
    }

    public async getFirstRoot(): Promise<TreeItem> {
        // delay for a bit, because context might be updating
        await new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 200);
        });

        return this._tree[0];
    }

    public getParent(): vscode.ProviderResult<TreeItem> {
        return Promise.resolve(undefined);
    }

    public insertProperty(item: TreeItem): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        
        const insertText = this._getInsertText(item);
        void editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, insertText);
        });
    }

    public refresh(): void {
        this._fetchTreeItems()
            ?.then(treeItems => {
                this._tree = treeItems;
                this._onDidChangeTreeData.fire(null);
            })
            .catch(err => {
                if (err instanceof Error) { 
                    void vscode.window.showErrorMessage(`Could not update tree: ${err.message}`); 
                }
            });
    }

    public setEndpoint(endpoint: string): void {
        this._endpointUrl = `${endpoint}/editor/model`;
        this.refresh();
    }

    private _fetchTreeItems() {
        const context = ContextHandler.getContext();
        if (!context) {
            return Promise.resolve([]);
        }

        const files = FileScrambler.getScenarioFiles(context);
        const steps = FileScrambler.getStepTypes(context);

        const requests = [];
        for(const file of files) {
            if (file.filename.startsWith('step')) {
                const stepId = file.filename.split('.')[1];
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

    private _getInsertText(item: TreeItem) : string {
        if (item.isCollection && item.children) {
            return `{{ for x in ${item.path} }}
    {{ x.${item.children[0].name} }} 
{{ end }}`;
        }
        return `{{${item.path}}}`;
    }

    private _getLabel(item: TreeItem) : string {
        return item.isCollection ? `${item.name} []` : item.name;
    }
}
