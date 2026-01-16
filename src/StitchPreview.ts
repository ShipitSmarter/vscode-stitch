import * as vscode from 'vscode';
import * as path from 'path';
import { Disposable } from './utils/dispose';
import { CONSTANTS } from './constants';
import { CommandAction, Context, ICommand } from './types';
import { PdfPreview } from './PdfPreview';
import { ContextHandler } from './ContextHandler';
import { StitchPreviewHelper } from './StitchPreviewHelper';
import { StitchPreviewHtmlBuilder } from './StitchPreviewHtmlBuilder';
import { unescapeResponseBody } from './utils/helpers';
import { EditorSimulateIntegrationResponse, ErrorData, StitchError } from './types/apiTypes';
import { RenderTemplateStepResult } from './types/stepResult';
import { HttpMulipartStepConfiguration, HttpStepConfiguration } from './types/stepConfiguration';

export class StitchPreview extends Disposable implements vscode.Disposable {
    
    private _result?: EditorSimulateIntegrationResponse;
    private _scrollPosition?: number;
    private _htmlHelper?: StitchPreviewHtmlBuilder;

    public static create(extensionUri: vscode.Uri): StitchPreview {

        const showOptions = {
            viewColumn: vscode.ViewColumn.Two,
            preserveFocus: true
        };
        const options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(extensionUri.path, 'assets'))]
        };
        const panel = vscode.window.createWebviewPanel('stitchPreview', 'Stitch Preview', showOptions, options);

        panel.iconPath = vscode.Uri.joinPath(extensionUri, 'assets/icon.png');

        return new StitchPreview(panel, extensionUri);
    }

    private constructor(
        private _panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri
    ) {
        super();

        this._panel.webview.html = '<html><body><h3>Loading preview...</h3></body></html>';

        const resolveAsUri = (...p: string[]): vscode.Uri => {
            return this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...p));
        };
        this._htmlHelper = new StitchPreviewHtmlBuilder(_panel.webview.cspSource, resolveAsUri);


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

    public get visible(): boolean {
        return this._panel?.visible ?? false;
    }

    public reveal(): void {
        this._panel?.reveal(vscode.ViewColumn.Two);
    }

    public handleCommand(command: ICommand, extensionUri: vscode.Uri): void {
        const response = this._result;

        ContextHandler.log(`Handling preview command: ${CommandAction[command.action]}, content: ${command.content}`);

        switch (command.action) {
            case CommandAction.viewStepRequest: {
                if (!response) { return; }

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
                if (!response) { return; }

                if (response.integrationContext.steps[command.content]?.$type !== CONSTANTS.renderTemplateStepResultType) { return; }
                const renderResponse = <RenderTemplateStepResult>response.integrationContext.steps[command.content];
                if (renderResponse.response.contentType !== 'application/pdf') { return; }
                PdfPreview.createOrShow(command.content, extensionUri);
                PdfPreview.setOrUpdatePdfData(command.content, renderResponse.response.content);
                return;
            }
            case CommandAction.viewIntegrationResponse: {
                if (!response) { return; }
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
                if (!response) { return; }
                const step = command.content;
                const httpConfig = <HttpStepConfiguration>response.stepConfigurations[step];
                StitchPreviewHelper.show({
                    filename: `stitch-step-request-${step}.http`,
                    content: StitchPreviewHelper.createHttpRequestContent(httpConfig)
                });
                return;
            }
            case CommandAction.createHttpMultipartRequest: {
                if (!response) { return; }  
                const step = command.content;
                const httpConfig = <HttpMulipartStepConfiguration>response.stepConfigurations[step];
                StitchPreviewHelper.show({
                    filename: `stitch-step-request-${step}.http`,
                    content: StitchPreviewHelper.createHttpMultipartRequestContent(httpConfig)
                });
                return;
            }
            case CommandAction.selectScenario: {
                void vscode.commands.executeCommand('stitch.selectScenario');
                return;
            }
            case CommandAction.openIntegration: {
                const fileUri = vscode.Uri.file(command.content);
                void vscode.window.showTextDocument(fileUri, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
                return;
            }
            case CommandAction.togglePinned: {
                void ContextHandler.togglePinned();
                return;
            }
        }
    }

    public showSimulationResult(simulationResult: EditorSimulateIntegrationResponse, context: Context) {
        if (!this._panel || !this._htmlHelper) { return; }
        
        this._result = simulationResult;
        this._panel.webview.html = this._htmlHelper.createHtml(context, simulationResult);
        if (this._scrollPosition) {
            void this._panel.webview.postMessage({ command: 'setScrollPosition', scrollY: this._scrollPosition });
            this._scrollPosition = undefined;
        }

        StitchPreviewHelper.update(simulationResult);
    }

    public showErrorResult(errorData: ErrorData, context: Context) {
        if (!this._panel) { return; }
        
        this._result = undefined;
        if (!this._scrollPosition) {
            void this._panel.webview.postMessage({ command: 'requestScrollPosition' });
        }

        if (errorData.ClassName === 'Core.Exceptions.StitchResponseSerializationException') {
            this._handleStitchError(context, {
                title: errorData.Message ?? 'Unexpected error',
                description: `${errorData.ResultBody}`
            }, `Exception:<br />${errorData.InnerException?.Message}`);
        }
        else {
            this._handleStitchError(context, {
                title: 'Render error',
                description: errorData.message || `${errorData.Message}`
            }, errorData.StackTraceString);
        }
    }

    public handleError(error: Error, title: string, context: Context) {
        if (!this._panel || !this._htmlHelper) { return; }
        
        this._result = undefined;
        this._panel.webview.html = this._htmlHelper.createErrorHtml(context, {
            title,
            description: error.message,
        }, JSON.stringify(error));
    }

    private _handleStitchError(context: Context, error: StitchError, extraBody?: string) {
        if (!this._panel || !this._htmlHelper) { return; }
        
        this._panel.webview.html = this._htmlHelper.createErrorHtml(context, error, extraBody);
    }
}



