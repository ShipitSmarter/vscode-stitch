import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { StitchView } from './StitchView';
import { FileScrambler } from './FileScrambler';
import { COMMANDS, CONSTANTS, MESSAGES } from './constants';
import { CommandAction, ICommand, PreviewContext, RenderTemplateStepResult, ScenarioSource, StitchResponse, TreeItem } from './types';
import { PdfPreview } from './PdfPreview';

export class StitchPreview {

    public static currentPreview: StitchPreview | undefined;

    private _disposables: vscode.Disposable[] = [];
    private _view: StitchView;
    private _context?: PreviewContext;
    private _scenario?: ScenarioSource;
    private _result?: StitchResponse;

    public static createOrShow(extensionUri: vscode.Uri, textEditor?: vscode.TextEditor): void {

        if (StitchPreview.currentPreview) {
            StitchPreview.currentPreview._panel.reveal(vscode.ViewColumn.Two);
            return;
        }

        if (!textEditor) {
            vscode.window.showErrorMessage('Please open a document first to create a preview for!');
            return;
        }

        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

        const showOptions = {
            viewColumn: vscode.ViewColumn.Two,
            preserveFocus: true
        };
        const options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(extensionUri.path, 'assets'))]
        };
        const panel = vscode.window.createWebviewPanel('stitchPreview', '', showOptions, options);
        panel.iconPath = vscode.Uri.joinPath(extensionUri, 'assets/icon.png');

        const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        statusBar.command = COMMANDS.selectScenario;
        statusBar.show();

        StitchPreview.currentPreview = new StitchPreview(panel, statusBar, `${endpoint}/test`, extensionUri);
    }

    public static selectScenario(): void {
        const current = StitchPreview.currentPreview;
        if (!current) { return; }

        const integrationContext = current._getContext();
        if (!integrationContext) { return; }

        const normalizeResult = FileScrambler.getScenarios(integrationContext);
        if (!normalizeResult.success) {
            current._view.displayError({
                title: 'some error for selecting scenario',
                description: 'this needs to be implemented'
            });
            return;
        }

        const scenarios = normalizeResult.scenarios;
        const quickPickItems = scenarios.map(x => x.name).sort();
        vscode.window.showQuickPick(quickPickItems).then((x): void => {
            if (x && current) {
                current._scenario = scenarios.find(s => s.name === x);
                current._update();
            }
        });
    }

    public static currentResponse(): StitchResponse | undefined {
        const current = StitchPreview.currentPreview;
        if (!current) { return; }

        return current._result;
    }

    public static async openScenarioFile(treeItem: TreeItem): Promise<void> {
        const current = StitchPreview.currentPreview;
        if (!current || !current._scenario) { return; }

        if (treeItem.path === 'Model') {
            const uri = vscode.Uri.file(path.join(current._scenario.path, 'input.txt'));
            await vscode.window.showTextDocument(uri);
            return;
        }

        const match = treeItem.path.match(/Steps.([a-zA-Z0-9_-]+).Model/);
        const stepName = match && match[1];
        if (stepName) {
            const uri = vscode.Uri.file(path.join(current._scenario.path, `step.${stepName}.txt`));
            await vscode.window.showTextDocument(uri);
        }
    }

    public static handleCommand(command: ICommand, extensionUri: vscode.Uri) {
        const response = StitchPreview.currentResponse();
        if (!response) { return; }

        switch (command.action) {
            case CommandAction.viewStepRequest:
                const step = command.content;
                this.showRendered({
                    filename: `stitch-step-request-${step}`,
                    content: response.requests[step].content.trim()
                });
                return;
            case CommandAction.viewStepResponse:
                if (response.integrationContext.steps[command.content]?.$type !== CONSTANTS.renderTemplateStepResultType) { return; }
                const renderResponse = <RenderTemplateStepResult>response.integrationContext.steps[command.content];
                if (renderResponse.response.contentType !== 'application/pdf') { return; }
                PdfPreview.createOrShow(command.content ,extensionUri);
                PdfPreview.setOrUpdatePdfData(command.content, renderResponse.response.content);
                return;
            case CommandAction.viewIntegrationResponse:
                this.showRendered({
                    filename: `stitch-response`,
                    content: JSON.stringify(response.result, null, 2)
                });
                return;
        }
    }

    static showRendered(options: { filename: string; content: string; }) {
        if (!options.content) { return; }

        const firstChar = options.content[0];
        const ext = firstChar === '<' ? '.xml' : firstChar === '{' ? '.json' : '.txt';

        const untitledFile = vscode.Uri.parse(`untitled:${options.filename}${ext}`);
        this.updateRendered(untitledFile, options.content, true);
    }

    static updateRendered(untitledUri: vscode.Uri, content: string, show: boolean = false) {
        vscode.workspace.openTextDocument(untitledUri).then(document => {
            const lastLine = document.lineAt(document.lineCount-1);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(untitledUri, new vscode.Range(new vscode.Position(0,0), lastLine.range.end), content);
            return vscode.workspace.applyEdit(edit).then(success => {
                if (success && show) {
                    vscode.window.showTextDocument(document, undefined, true);
                } else {
                    vscode.window.showInformationMessage('Error!');
                }
            });
        });
    }

    constructor(
        private _panel: vscode.WebviewPanel,
        private _statusBar: vscode.StatusBarItem,
        private _testEndpoint: string,
        extensionUri: vscode.Uri) {

        this._view = new StitchView(_panel.webview, extensionUri);
        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        vscode.workspace.onDidChangeTextDocument((_e): void => {
            this._update();
        }, null, this._disposables);
        vscode.window.onDidChangeActiveTextEditor((e): void => {
            e && ['file'].includes(e.document.uri.scheme) && this._update(e);
        }, null, this._disposables);

        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(CONSTANTS.configKeyEndpointUrl)) {
                this._onUpdateEndoint();
            }
        }, null, this._disposables);
    }

    dispose() {
        StitchPreview.currentPreview = undefined;

        vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, false);
        this._panel.dispose();
        this._statusBar.dispose();
        PdfPreview.disposeAll();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _onUpdateEndoint() {

        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

        this._testEndpoint = `${endpoint}/test`;
        vscode.window.showInformationMessage('The Stitch test endpoint has been updated to: ' + endpoint);
        this._update();
    }

    private _getContext(textEditor?: vscode.TextEditor): PreviewContext | undefined {
        const activeEditor = textEditor || vscode.window.activeTextEditor;
        if (!activeEditor) {
            this._view.displayError({
                title: 'No document open',
                description: 'Please open a document to enable the preview!'
            });
            return;
        }

        if (activeEditor.document.isUntitled) {
            this._view.displayError({
                title: 'Untitled files are not supported!',
                description: 'Please save your file and try again.'
            });
            return;
        }

        const activeFile = {
            filepath: activeEditor.document.fileName,
            filecontent: activeEditor.document.getText()
        };
        return FileScrambler.determinePreviewContext(activeFile, this._context);
    }

    private _update(textEditor?: vscode.TextEditor) {

        const integrationContext = this._getContext(textEditor);
        if (!integrationContext) {
            this._view.displayError({
                title: `No ${CONSTANTS.integrationExtension} file found`,
                description: `Please open an *${CONSTANTS.integrationExtension} file or directory to enable the preview!`
            });
            vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, false);
            return;
        }

        if (this._isContextChanged(integrationContext)) {
            this._scenario = undefined;
            PdfPreview.disposeAll();
        }
        this._context = integrationContext;
        this._panel.title = `${CONSTANTS.panelTitlePrefix}${integrationContext.integrationFilename}`;

        const normalizeResult = FileScrambler.getScenarios(integrationContext);
        if (!normalizeResult.success) {
            this._view.displayError({
                title: 'No scenarios found',
                description: `To provide a scenario create a "scenarios" directory next to the ${integrationContext.integrationFilename} file, subdirectories within the "scenarios" directory are regarded as scenarios.`
            });
            return;
        }

        const scenario = this._scenario || normalizeResult.scenarios[0];
        if (!FileScrambler.isValidScenario(scenario)) {
            this._view.displayError({
                title: 'Invalid scenario',
                description: `Scenario "${scenario.name}" requires at least the following files: <ul><li>input.txt</li><li>step.*.txt</li></ul>`
            });
            this._statusBar.text = "";
            return;
        }

        this._scenario = scenario;
        vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, true);

        this._statusBar.text = `${CONSTANTS.statusbarTitlePrefix}${scenario.name}`;
        const model = FileScrambler.collectFiles(integrationContext, scenario, this._readWorkspaceFile);

        axios.post(this._testEndpoint, model)
            .then(res => {
                this._view.displayResult(res.data, integrationContext, scenario);
                if (res.data.result) {
                    this._result = <StitchResponse>res.data;
                    this._updateRenderedUntitled();
                    this._updateRenderedPdf();
                    vscode.commands.executeCommand(COMMANDS.responseUpdated); // so other Components know to request the latest response
                }
            })
            .catch(err => {
                this._view.displayError({
                    title: 'Request failed',
                    description: JSON.stringify(err)
                });
            });
    }

    private _updateRenderedUntitled() {

        const open = vscode.workspace.textDocuments.filter(t => t.uri.scheme === 'untitled' && t.fileName.startsWith('stitch-'));
        const response = this._result;
        if (open.length === 0 || !response) {return;}

        open.forEach(o => {
            if (o.fileName.startsWith('stitch-response.')) {
                StitchPreview.updateRendered(o.uri, JSON.stringify(response.result, null, 2));
            } else {
                let match = o.fileName.match(/^stitch-step-request-(.*?)\./);
                if (match?.length === 2) {
                    StitchPreview.updateRendered(o.uri, response.requests[match[1]].content.trim());
                }
            }
        });
    }

    private _updateRenderedPdf() {
        if (!this._result) { return; }
        const response = this._result;

        for (const stepId of PdfPreview.renderedSteps) {
            if (response.integrationContext.steps[stepId]?.$type !== CONSTANTS.renderTemplateStepResultType) { 
                PdfPreview.disposeRenderedStep(stepId);
                continue;
            }
            const renderResponse = <RenderTemplateStepResult>response.integrationContext.steps[stepId];
            if (renderResponse.response.contentType !== 'application/pdf') { 
                PdfPreview.disposeRenderedStep(stepId);
                continue;
             }
            PdfPreview.setOrUpdatePdfData(stepId, renderResponse.response.content);
        }
    }

    private _isContextChanged(newContext: PreviewContext) {
        return this._context?.integrationFilePath !== newContext.integrationFilePath;
    }

    private _readWorkspaceFile(filepath: string): string | undefined {
        const textDoc = vscode.workspace.textDocuments.find(doc => doc.fileName === filepath);
        if (textDoc) {
            return textDoc.getText();
        }
    }
}
