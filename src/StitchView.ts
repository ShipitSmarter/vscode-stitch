import * as vscode from 'vscode';
import { HtmlHelper } from './HtmlHelper';
import { StitchPreview } from './StitchPreview';
import { CommandAction, ICommand, PreviewContext, ScenarioSource, StitchError, StitchResponse } from './types';

export class StitchView {

    private _stylesMainUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    constructor(private _webview: vscode.Webview, extensionUri: vscode.Uri) {
        this._stylesMainUri = _webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'style.css'));
        _webview.onDidReceiveMessage(
            (command: ICommand) => { StitchPreview.handleCommand(command, extensionUri); },
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

    public displayResult(data: any, previewContext: PreviewContext, scenario: ScenarioSource): void {
        if (!data.result) {
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
        const stepHtml = Object
            .keys(response.integrationContext.steps)
            .map(key => { return HtmlHelper.getStepHtml(response.integrationContext.steps[key], response.stepConfigurations[key]); })
            .join('');

        var resultStatusCode = response.resultStatusCode ? response.resultStatusCode : 200;
        var actionCommand = `{action: ${CommandAction.viewIntegrationResponse} }`;
        var body =  `<pre><code>${JSON.stringify(response.result, null, 2)}</code></pre>`;

        const htmlBody = `<h2>Steps</h2>
                          <div class="preview-container">${stepHtml}</div>
                          <h2>Response</h2>
                          ${HtmlHelper.getActionHtml('', resultStatusCode, actionCommand, body)}`;

        this._webview.html = this._getHtml(htmlBody);
    }

    private _getHtml(htmlBody: string): string {
        const cspSource = this._webview.cspSource;
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Stitch Preview</title>

                <meta http-equiv="Content-Security-Policy" content="
                    default-src 'none';
                    style-src ${cspSource};
                    script-src 'unsafe-inline';
                    img-src ${cspSource} https:;">
                <link href="${this._stylesMainUri}" rel="stylesheet">
                <script>
                    window.acquireVsCodeApi = acquireVsCodeApi;
                </script>
            </head>
            <body>
                ${htmlBody}
                <script>
                    const vscode = window.acquireVsCodeApi();
                </script>
            </body>
            </html>`;
    }
}
