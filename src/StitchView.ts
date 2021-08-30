import * as vscode from 'vscode';
import { CONSTANTS } from './constants';
import { StitchPreview } from './StitchPreview';
import { CommandAction, HttpStepResult, ICommand, PreviewContext, RenderTemplateStepResult, ScenarioSource, StepRequest, StepResult, StitchError, StitchResponse } from './types';

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
        extraBody = this._escapeHtml(extraBody || '');
        const htmlBody = `<h1 class="error">${error.title}</h1>
                          <p>${this._escapeHtml(error.description)}</p><p>${extraBody}</p>`;
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
            .map(key => { return `<li>${this._getStepHtml(key, response.integrationContext.steps[key], response.requests)}</li>`; })
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
                        <th>Integration</th><td>${this._escapeHtml(previewContext.integrationFilename)}<td>
                    </tr>
                    <tr>
                        <th>Scenario</th><td>${scenario.name}<td>
                    </tr>
                </table>`;
    }

    private _getStepHtml(stepId: string, step: StepResult, requests: Record<string, StepRequest>) {
        if (step.$type === CONSTANTS.httpStepResultTypeType) {
            const httpStep = <HttpStepResult>step;
            return `<div>
                        <h4>${stepId}</h4>
                        <p>${httpStep.request.method} - ${httpStep.request.url}</p>
                        <button onclick="vscode.postMessage({action: ${CommandAction.viewStepRequest}, content: '${stepId}' });">view as file</button>
                        <pre><code>${this._escapeHtml(requests[stepId].content)}</code></pre>
                    </div>`;
        }
        else if (step.$type === CONSTANTS.renderTemplateStepResultType) {
            const renderStep = <RenderTemplateStepResult>step;
            var stepHtml = `<div>
                                <h4>${stepId}</h4>
                                <h5>INPUT | Zip (base64)</h5>
                                <pre><code>${StitchView._trimQuotationMarks(requests[stepId].content)}</code></pre>`;
            if (renderStep.response.isSuccessStatusCode) {
                stepHtml +=    `<h5>OUTPUT | Pdf (base64)</h5>
                                <button onclick="vscode.postMessage({action: ${CommandAction.viewStepResponse}, content: '${stepId}' });">view as file</button>
                                <pre><code>${renderStep.response.content}</code></pre>`;
            }
            else {
                stepHtml +=    `<h5>OUTPUT | Error (${renderStep.response.statusCode})
                                <p>${renderStep.response.errorMessage}</p>`;
            }
            stepHtml += '</div>';
            return stepHtml;
        }
        else {
            return `<div>
                        <h4>${stepId}</h4>
                        <p>Started: ${step.started}</p>
                    </div>`;
        }
        

    }

    private static _trimQuotationMarks(untrimmed: string) {
        let result = untrimmed;
        if (untrimmed.startsWith('"')) {
            result = result.substr(1);
        }
        if (untrimmed.endsWith('"')) {
            result = result.slice(0, -1);
        }

        return result;
    }

    private _escapeHtml(unsafe: string) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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
