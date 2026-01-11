import * as vscode from 'vscode';
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

export class StitchPreview implements vscode.WebviewViewProvider, vscode.Disposable {
    
    private _view?: vscode.WebviewView;
    private _result?: EditorSimulateIntegrationResponse;
    private _scrollPosition?: number;
    private _htmlHelper?: StitchPreviewHtmlBuilder;
    private _disposables: vscode.Disposable[] = [];

    public constructor(
        private readonly _extensionUri: vscode.Uri
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void | Thenable<void> {
        this._view = webviewView;

        ContextHandler.log(`Stitch Preview webview resolved`);

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'assets')]
        };

        const resolveAsUri = (...p: string[]): vscode.Uri => {
            return webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ...p));
        };
        this._htmlHelper = new StitchPreviewHtmlBuilder(webviewView.webview.cspSource, resolveAsUri);

        webviewView.webview.onDidReceiveMessage(
            (command: ICommand) => { ContextHandler.handlePreviewCommand(command, this._extensionUri); },
            undefined,
            this._disposables
        );

        webviewView.onDidChangeVisibility(
            () => {
                ContextHandler.log(`Stitch Preview visibility changed: ${webviewView.visible}`);
                if (webviewView.visible) {
                    ContextHandler.showPreview(this);
                } else {
                    ContextHandler.hidePreview();
                }
            },
            undefined,
            this._disposables
        );

        webviewView.onDidDispose(
            () => this.dispose(),
            undefined,
            this._disposables
        );

        // Request initial update if context is available
        ContextHandler.showPreview(this);
    }

    public dispose(): void {
        PdfPreview.disposeAll();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    public handleCommand(command: ICommand, extensionUri: vscode.Uri): void {
        const response = this._result;
        if (!response) { return; }

        ContextHandler.log(`Handling preview command: ${CommandAction[command.action]}, content: ${command.content}`);

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
            case CommandAction.selectScenario: {
                void vscode.commands.executeCommand('stitch.selectScenario');
                return;
            }
            case CommandAction.openIntegration: {
                const fileUri = vscode.Uri.file(command.content);
                void vscode.window.showTextDocument(fileUri, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
                return;
            }
        }
    }

    public showSimulationResult(simulationResult: EditorSimulateIntegrationResponse, context: Context) {
        if (!this._view || !this._htmlHelper) { return; }
        
        this._result = simulationResult;
        this._view.webview.html = this._htmlHelper.createHtml(context, simulationResult);
        if (this._scrollPosition) {
            void this._view.webview.postMessage({ command: 'setScrollPosition', scrollY: this._scrollPosition });
            this._scrollPosition = undefined;
        }

        StitchPreviewHelper.update(simulationResult);
    }

    public showErrorResult(errorData: ErrorData, context: Context) {
        if (!this._view) { return; }
        
        this._result = undefined;
        if (!this._scrollPosition) {
            void this._view.webview.postMessage({ command: 'requestScrollPosition' });
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
        if (!this._view || !this._htmlHelper) { return; }
        
        this._result = undefined;
        this._view.webview.html = this._htmlHelper.createErrorHtml(context, {
            title,
            description: error.message,
        }, JSON.stringify(error));
    }

    private _handleStitchError(context: Context, error: StitchError, extraBody?: string) {
        if (!this._view || !this._htmlHelper) { return; }
        
        this._view.webview.html = this._htmlHelper.createErrorHtml(context, error, extraBody);
    }
}



