import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { Disposable } from './utils/dispose';
import { CONSTANTS } from './constants';
import { CommandAction, ICommand } from './types';
import { PdfPreview } from './PdfPreview';
import { ContextHandler } from './ContextHandler';
import { StitchPreviewHelper } from './StitchPreviewHelper';
import { StitchPreviewHtmlBuilder } from './StitchPreviewHtmlBuilder';
import { unescapeResponseBody } from './utils/helpers';
import { IngrationRequestBuilder } from './utils/IntegrationRequestBuilder';
import { EditorSimulateIntegrationResponse, ErrorData, IntegrationRequestModel, StitchError } from './types/apiTypes';
import { RenderTemplateStepResult } from './types/stepResult';
import { HttpMulipartStepConfiguration, HttpStepConfiguration } from './types/stepConfiguration';

export class StitchPreview extends Disposable implements vscode.Disposable {

    private _result?: EditorSimulateIntegrationResponse;
    private _scrollPosition?: number;
    private _currentIntegrationPath?: string;
    private _htmlHelper: StitchPreviewHtmlBuilder;

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

        return new StitchPreview(panel, `${endpoint}`, extensionUri);
    }

    private constructor(
        private _panel: vscode.WebviewPanel,
        private _editorEndpoint: string,
        extensionUri: vscode.Uri
    ) {
        super();

        const resolveAsUri = (...p: string[]): vscode.Uri => {
            return this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...p));
        };
        this._htmlHelper = new StitchPreviewHtmlBuilder(_panel.webview.cspSource, resolveAsUri);
        this.update();

        const onPanelDisposeListener = this._panel.onDidDispose(() => this.dispose());
        const onDidReceiveMessageListener = this._panel.webview.onDidReceiveMessage(
            (command: ICommand) => { ContextHandler.handlePreviewCommand(command, extensionUri); }
        );

        this._register(this._panel);
        this._register(onPanelDisposeListener);
        this._register(onDidReceiveMessageListener);
    }

    public dispose(): void {
        PdfPreview.disposeAll();
        super.dispose();
    }

    public reveal(): void {
        this._panel.reveal(vscode.ViewColumn.Two);
    }

    public setEndpoint(endpoint: string): void {
        this._editorEndpoint = `${endpoint}`;
        this.update();
    }

    public update(): void {

        const context = ContextHandler.getContext();
        if (!context) {
            this._handleStitchError({
                title: `No ${CONSTANTS.integrationExtensionJson} or ${CONSTANTS.integrationExtensionYaml} file found`,
                description: `Please open an *${CONSTANTS.integrationExtensionJson} or *${CONSTANTS.integrationExtensionYaml} file or directory to enable the preview!`
            });
            return;
        }

        if (this._currentIntegrationPath && this._currentIntegrationPath !== context.integrationFilePath) {
            PdfPreview.disposeAll();
        }
        this._panel.title = `${CONSTANTS.panelTitlePrefix}${context.integrationFilename}`;

        let model: IntegrationRequestModel | undefined;
        try {
            const builder = new IngrationRequestBuilder(context, ContextHandler.getRootFolderName());
            model = builder.build();
        } catch (error) {
            if (error instanceof Error) {
                return this._handleError(error, 'Collecting files failed');
            }
        }

        const simulateIntegrationUrl = `${this._editorEndpoint}/editor/simulate/integration`;
        axios.post(simulateIntegrationUrl, model)
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
                const template = response.stepConfigurations[step].template?.trim();
                if (!template) {
                    void vscode.window.showInformationMessage("No data to show");
                    return;
                }
                StitchPreviewHelper.show({
                    filename: `stitch-step-request-${step}`,
                    content: template
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
                StitchPreviewHelper.show({
                    filename: `stitch-response`,
                    content: unescapeResponseBody(response.result)
                });
                return;
            }
            case CommandAction.storeScrollPosition: {
                this._scrollPosition = +command.content;
                return;
            }
            case CommandAction.createHttpRequest: {
                const step = command.content;
                const httpConfig = <HttpStepConfiguration>response.stepConfigurations[step];
                StitchPreviewHelper.show({
                    filename: `stitch-step-request-${step}.http`,
                    content: StitchPreviewHelper.createHttpRequestContent(httpConfig)
                });
                return;
            }
            case CommandAction.createHttpMultipartRequest: {
                const step = command.content;
                const httpConfig = <HttpMulipartStepConfiguration>response.stepConfigurations[step];
                StitchPreviewHelper.show({
                    filename: `stitch-step-request-${step}.http`,
                    content: StitchPreviewHelper.createHttpMultipartRequestContent(httpConfig)
                });
                return;
            }
        }
    }

    private _handleResponse(responseData: ResponseData) {
        const okResult = responseData.result;
        if (okResult) {
            this._result = <EditorSimulateIntegrationResponse>responseData;

            this._panel.webview.html = this._htmlHelper.createHtml(this._result);
            if (this._scrollPosition) {
                void this._panel.webview.postMessage({ command: 'setScrollPosition', scrollY: this._scrollPosition });
                this._scrollPosition = undefined;
            }

            StitchPreviewHelper.update(this._result);
        }
        else {
            if (!this._scrollPosition) {
                void this._panel.webview.postMessage({ command: 'requestScrollPosition' });
            }

            const errorData = <ErrorData>responseData;
            if (errorData.ClassName === 'Core.Exceptions.StitchResponseSerializationException') {
                this._handleStitchError({
                    title: errorData.Message ?? 'Unexpected error',
                    description: `${errorData.ResultBody}`
                }, `Exception:<br />${errorData.InnerException?.Message}`);
            }
            else {
                this._handleStitchError({
                    title: 'Render error',
                    description: errorData.message || `${errorData.Message}`
                }, errorData.StackTraceString);
            }
        }
    }

    private _handleError(error: Error, title: string) {
        this._panel.webview.html = this._htmlHelper.createErrorHtml({
            title,
            description: error.message,
        }, JSON.stringify(error));
    }

    private _handleStitchError(error: StitchError, extraBody?: string) {
        this._panel.webview.html = this._htmlHelper.createErrorHtml(error, extraBody);
    }
}

// Note: needed to be able to handle error
interface ResponseData {
    result?: unknown;
}

