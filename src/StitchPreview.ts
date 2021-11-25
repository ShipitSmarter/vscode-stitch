import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { StitchView } from './StitchView';
import { FileScrambler } from './FileScrambler';
import { Disposable } from './dispose';
import { COMMANDS, CONSTANTS } from './constants';
import { CommandAction, ICommand, IntegrationRequestModel, RenderTemplateStepResult, StitchResponse } from './types';
import { PdfPreview } from './PdfPreview';
import { ContextHandler } from './ContextHandler';
import { RenderedHelper } from './RenderedHelper';

export class StitchPreview extends Disposable implements vscode.Disposable {

    private _view: StitchView;
    
    private _result?: StitchResponse;
    private _scrollPosition?: number;
    private _currentIntegrationPath?: string;

    public static create(extensionUri: vscode.Uri, endpoint: string): StitchPreview {

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

        return new StitchPreview(panel, statusBar, `${endpoint}/editor/simulate`, extensionUri);
    }

    constructor(        
        private _panel: vscode.WebviewPanel,
        private _statusBar: vscode.StatusBarItem,
        private _editorEndpoint: string,
        extensionUri: vscode.Uri
    ) {
        super();

        this._view = new StitchView(_panel.webview, extensionUri);
        this.update();

        const onPanelDisposeListener = this._panel.onDidDispose(() => this.dispose());

        this._register(this._statusBar);
        this._register(this._panel);
        this._register(onPanelDisposeListener);
    }

    dispose() {
        
        vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, false);

        PdfPreview.disposeAll();
        super.dispose();
    }

    public reveal(): void {
        this._panel.reveal(vscode.ViewColumn.Two);
    }

    public setEndpoint(endpoint: string): void {
        this._editorEndpoint = `${endpoint}/editor/simulate`;
        this.update();
    }

    public update() {

        const context = ContextHandler.getContext();
        if (!context) {
            this._view.displayError({
                title: `No ${CONSTANTS.integrationExtension} file found`,
                description: `Please open an *${CONSTANTS.integrationExtension} file or directory to enable the preview!`
            });
            return;
        }

        if (this._currentIntegrationPath && this._currentIntegrationPath !== context.integrationFilePath) {
            PdfPreview.disposeAll();
        }
        this._panel.title = `${CONSTANTS.panelTitlePrefix}${context.integrationFilename}`;

        this._statusBar.text = `${CONSTANTS.statusbarTitlePrefix}${context.activeScenario.name}`;
        var model: IntegrationRequestModel;
        try {
            model = FileScrambler.collectFiles(context, this._readWorkspaceFile);
        } catch(error: any) {
            this._view.displayError({
                title: 'Collecting files failed',
                description: error.message
            }, JSON.stringify(error));
            return;
        }

        axios.post(this._editorEndpoint, model)
            .then(res => {
                this._view.displayResult(res.data);
                if (res.data.result) {
                    if (this._scrollPosition) {
                        this._view.scrollToPosition(this._scrollPosition);
                        this._scrollPosition = undefined;
                    }
                    this._result = <StitchResponse>res.data;
                    RenderedHelper.update(this._result);
                    vscode.commands.executeCommand(COMMANDS.responseUpdated); // so other Components know to request the latest response
                }
            })
            .catch(err => {
                this._view.displayError({
                    title: 'Request failed',
                    description: err.message,
                }, JSON.stringify(err));
            });
    }

    // TODO: Temp solution, should be removed
    public currentResponse(): StitchResponse | undefined {
        return this._result;
    }

    public handleCommand(command: ICommand, extensionUri: vscode.Uri) {
        const response = this.currentResponse();
        if (!response) { return; }

        switch (command.action) {
            case CommandAction.viewStepRequest:
                const step = command.content;
                RenderedHelper.show({
                    filename: `stitch-step-request-${step}`,
                    content: response.stepConfigurations[step].template.trim()
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
                RenderedHelper.show({
                    filename: `stitch-response`,
                    content: JSON.stringify(response.result, null, 2)
                });
                return;
            case CommandAction.storeScrollPosition:
                this._scrollPosition = +command.content;
                return;
        }
    }

    private _readWorkspaceFile(filepath: string): string | undefined {
        const textDoc = vscode.workspace.textDocuments.find(doc => doc.fileName === filepath);
        if (textDoc) {
            return textDoc.getText();
        }
    }
}
