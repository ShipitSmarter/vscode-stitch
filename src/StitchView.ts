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
        const contextHtml = this._getContextHtml(previewContext, scenario);

        if (!data.result) {
            if (data.ClassName === 'Core.Exceptions.StitchResponseSerializationException') {
                return this.displayError({
                    title: data.Message,
                    description: `<pre><code>${data.ResultBody}</code></pre><strong>Exception:</strong><br />${data.InnerException?.Message}`
                }, contextHtml);
            }

            return this.displayError({
                title: 'Render error',
                description: data.message || `${data.Message}<br /><br />${data.StackTraceString}`
            }, contextHtml);
        }

        const response = <StitchResponse>data;
        const stepHtml = Object
            .keys(response.integrationContext.steps)
            .map(key => { return `<li>${HtmlHelper.getStepHtml(response.integrationContext.steps[key], key, response.stepConfigurations[key])}</li>`; })
            .join('');

        var resultStatusCode = response.resultStatusCode ? response.resultStatusCode : 200;

        const htmlBody = `<h1>Output</h1>
                          <button onclick="vscode.postMessage({action: ${CommandAction.viewIntegrationResponse} });">view as file</button>
                          <pre><code>${JSON.stringify(response.result, null, 2)}</code></pre>
                          <p>Statuscode: ${resultStatusCode}</p>
                          ${contextHtml}
                          <h3>Steps</h3>
                          <ul>${stepHtml}</ul>`;

        this._webview.html = this._getHtml(htmlBody);
    }

    private _getContextHtml(previewContext: PreviewContext, scenario: ScenarioSource): string | undefined {
        return `<h3>Context</h3>                          
                <table>
                    <tr>
                        <th>Integration</th><td>${HtmlHelper.escapeHtml(previewContext.integrationFilename)}<td>
                    </tr>
                    <tr>
                        <th>Scenario</th><td>${scenario.name}<td>
                    </tr>
                </table>`;
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
