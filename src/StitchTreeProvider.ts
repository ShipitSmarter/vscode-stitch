import * as vscode from 'vscode';
import { COMMANDS, CONSTANTS } from './constants';
import { ContextHandler } from './ContextHandler';
import { TreeBuilder } from './utils/TreeBuilder';
import { TreeItem } from './types';
import { FileScrambler } from './utils/FileScrambler';
import axios, { AxiosResponse } from 'axios';
import { delay } from './utils/helpers';
import { ScenarioHelper } from './utils/ScenarioHelper';
import { DetectedModel } from './types/apiTypes';

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
            const inputPath = ScenarioHelper.getScenarioInputFilepath(scenario);
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
            return this._fetchTreeItems();
        }
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

    private _fetchTreeItems(): Promise<TreeItem[]> {
        const context = ContextHandler.getContext();
        if (!context) {
            return Promise.resolve([]);
        }

        const files = ScenarioHelper.getScenarioFiles(context);
        const steps = FileScrambler.getStepTypes(context);

        if (files.length === 0) {
            return Promise.resolve([]);
        }

        const requests = [];
        const inputFiles = files.filter(f => f.filename.startsWith('input'));

        if (inputFiles.length > 0) {

            const integrationFile = FileScrambler.readIntegrationFile(context);
            const preParser = integrationFile.integration.Request?.PreParser
            if (preParser) {
                requests
                    .push(axios.post(this._endpointUrl + "/with-preparser", { 
                            inputFile: inputFiles[0],
                            preParserConfigFile: ScenarioHelper.getFileInput(context, preParser.ConfigurationFilePath!),
                            preParser: integrationFile.integration.Request?.PreParser
                        })
                        .then((res: AxiosResponse<DetectedModel>) => { 
                            return TreeBuilder.generateTreeItemInput(res.data); 
                        })
                    );
            } else {
                requests
                    .push(axios.post(this._endpointUrl, { file: inputFiles[0] })
                        .then((res: AxiosResponse<DetectedModel>) => { 
                            return TreeBuilder.generateTreeItemInput(res.data); 
                        })
                    );
            }

            
        }

        for (const stepId of Object.keys(steps)) {
            const file = files.find(f => f.filename.startsWith(`step.${stepId}`));
            if (file) {
                requests.push(axios.post(this._endpointUrl, { file })
                    .then((res: AxiosResponse<DetectedModel>) => { 
                        return TreeBuilder.generateTreeItemStep(stepId, steps[stepId], res.data); 
                    })
                );
            }
            else {
                requests.push(Promise.resolve(TreeBuilder.generateTreeItemStep(stepId, steps[stepId])));
            }
        }

        return Promise.all(requests);
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
