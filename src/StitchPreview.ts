import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { StitchView } from './StitchView';
import { FileScrambler } from './FileScrambler';
import { Disposable } from './dispose';
import { CONSTANTS } from './constants';
import { CommandAction, ErrorData, ICommand, IntegrationRequestModel, RenderTemplateStepResult, StitchResponse } from './types';
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

        return new StitchPreview(panel, `${endpoint}/editor/simulate`, extensionUri);
    }

    private constructor(
        private _panel: vscode.WebviewPanel,
        private _editorEndpoint: string,
        extensionUri: vscode.Uri
    ) {
        super();

        this._view = new StitchView(_panel.webview, extensionUri);
        this.update();

        const onPanelDisposeListener = this._panel.onDidDispose(() => this.dispose());

        this._register(this._panel);
        this._register(onPanelDisposeListener);
    }

    public dispose(): void {
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

    public update(): void {

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

        let model: IntegrationRequestModel | undefined;
        try {
            model = FileScrambler.collectFiles(context);
        } catch(error) { 
            if (error instanceof Error){
                return this._handleError(error, 'Collecting files failed'); 
            }
        }

        axios.post(this._editorEndpoint, model)
            .then(res => this._handleResponse(<ResponseData>res.data))
            .catch(err => {
                if (err instanceof Error) {
                    this._handleError(err, 'Request failed');
                }
            });
    }

    public handleCommand(command: ICommand, extensionUri: vscode.Uri): void {
        const response = this._result;
        if (!response) { return; }

        switch (command.action) {
            case CommandAction.viewStepRequest: {
                const step = command.content;
                RenderedHelper.show({
                    filename: `stitch-step-request-${step}`,
                    content: response.stepConfigurations[step].template.trim()
                });
                return;
            }
            case CommandAction.viewStepResponse: {
                if (response.integrationContext.steps[command.content]?.$type !== CONSTANTS.renderTemplateStepResultType) { return; }
                const renderResponse = <RenderTemplateStepResult>response.integrationContext.steps[command.content];
                if (renderResponse.response.contentType !== 'application/pdf') { return; }
                PdfPreview.createOrShow(command.content, extensionUri);
                PdfPreview.setOrUpdatePdfData(command.content, renderResponse.response.content);
                return;
            }
            case CommandAction.viewIntegrationResponse: {
                RenderedHelper.show({
                    filename: `stitch-response`,
                    content: JSON.stringify(response.result, null, 2)
                });
                return;
            }
            case CommandAction.storeScrollPosition: {
                this._scrollPosition = +command.content;
                return;
            }
        }
    }

    private _handleResponse(responseData: ResponseData) {
        const okResult = responseData.result;
        if (okResult) {
            this._view.displayResult(<StitchResponse>responseData);
            if (this._scrollPosition) {
                this._view.scrollToPosition(this._scrollPosition);
                this._scrollPosition = undefined;
            }

            this._result = <StitchResponse>responseData;
            RenderedHelper.update(this._result);
        } 
        else {
            if (!this._scrollPosition){
                void this._panel.webview.postMessage({command: 'requestScrollPosition'});
            }

            this._view.displayResultError(<ErrorData>responseData);
        }
    }

    private _handleError(error: Error, title: string) {
        this._view.displayError({
            title,
            description: error.message,
        }, JSON.stringify(error));
    }
}

interface ResponseData {
    result?: unknown;
}