import * as vscode from 'vscode';
import { ContextHandler } from './ContextHandler';
import { HtmlHelper } from './HtmlHelper';
import { BaseStepConfiguration, CommandAction, ICommand, StitchError, StitchResponse } from './types';

export class StitchView {

    private _disposables: vscode.Disposable[] = [];

    constructor(private _webview: vscode.Webview, private _extensionUri: vscode.Uri) {
        _webview.onDidReceiveMessage(
            (command: ICommand) => { ContextHandler.handlePreviewCommand(command, _extensionUri); },
            undefined,
            this._disposables
        );
    }

    public displayError(error: StitchError, extraBody?: string): void {
        extraBody = HtmlHelper.escapeHtml(extraBody || '');
        const htmlBody = `<h1 class="error">${error.title}</h1>
                          <p>${HtmlHelper.escapeHtml(error.description)}</p><p>${extraBody}</p>`;
        this._webview.html = this._getHtml(htmlBody);
    }

    public displayResult(data: any): void {
        if (!data.result) {
            this._webview.postMessage({command: 'requestScrollPosition'});
            if (data.ClassName === 'Core.Exceptions.StitchResponseSerializationException') {
                return this.displayError({
                    title: data.Message,
                    description: `<pre><code>${data.ResultBody}</code></pre><strong>Exception:</strong><br />${data.InnerException?.Message}`
                });
            }

            return this.displayError({
                title: 'Render error',
                description: data.message || `${data.Message}<br /><br />${data.StackTraceString}`
            });
        }

        const response = <StitchResponse>data;
        const stepsHtml = Object
            .keys(response.integrationContext.steps)
            .map(key => { return HtmlHelper.getStepHtml(
                response.integrationContext.steps[key],
                response.stepConfigurations[key] ?? <BaseStepConfiguration> { id: key, template: '' });
            }).join('');

        var resultStatusCode = response.resultStatusCode ? response.resultStatusCode : 200;
        var actionCommand = `{action: ${CommandAction.viewIntegrationResponse} }`;
        var body =  `<pre><code>${JSON.stringify(response.result, null, 2)}</code></pre>`;

        var stepsNav = Object.keys(response.integrationContext.steps).map(key => { return `<a href="#${key}">${key}</a>`; }).join('');
        var quickNav = `${stepsNav}<a href="#integration_response">Response</a>`;

        const htmlBody = `<div class="container">
                            <h2>Steps</h2>
                            ${stepsHtml}
                            <h2 id="integration_response">Response</h2>
                            ${HtmlHelper.getActionHtml('', resultStatusCode, '', actionCommand, body)}
                          </div>
                          <div class="quicknav"><strong>&nbsp;Nav</strong> ${quickNav}</div>`;

        this._webview.html = this._getHtml(htmlBody);
    }

    public  scrollToPosition(scrollPosition: number) {
        this._webview.postMessage({ command: 'setScrollPosition', scrollY: scrollPosition});
    }

    private _getHtml(htmlBody: string): string {
        const cspSource = this._webview.cspSource;
        const resolveAsUri = (...p: string[]): vscode.Uri => {
            return this._webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ...p));
        };
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Stitch Preview</title>

                <meta http-equiv="Content-Security-Policy" content="
                    default-src 'none';
                    style-src ${cspSource};
                    script-src 'unsafe-inline' ${cspSource};
                    img-src ${cspSource} https:;">
                <link href="${resolveAsUri('assets', 'style.css')}" rel="stylesheet">
                <script>
                    window.acquireVsCodeApi = acquireVsCodeApi;
                </script>
            </head>
            <body>
                ${htmlBody}
                <script>
                    const vscode = window.acquireVsCodeApi();
                </script>
                <script src="${resolveAsUri('assets', 'preview.js')}"></script>
            </body>
            </html>`;
    }
}
