import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { CONSTANTS } from './constants';
import { StitchPreview } from './StitchPreview';
import { HttpStepResult, ICommand, PreviewContext, ScenarioSource, StepRequest, StepResult, StitchError, StitchResponse } from './types';

export class StitchView {

    private _stylesMainUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];


    constructor(private _webview: vscode.Webview, extensionUri: vscode.Uri) {
        this._stylesMainUri = _webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'style.css'));
        _webview.onDidReceiveMessage(
            (command: ICommand) => {
                vscode.window.showInformationMessage("open file", command.action);
                const currentResponse = StitchPreview.currentResponse();
                if (!currentResponse) { return; }
                if (command.action === 'viewStepInput') {
                    const step = command.content;
                    const stepInput = currentResponse.requests[step].content.trim();
                    if (!stepInput) { return; }
                    const ext = stepInput[0] === '<' ? '.xml' : stepInput[0] === '{' ? '.json' : '';
                    const tmp = os.tmpdir();
                    const tmpfile = path.join(tmp, `stitch-step-request-${step}${ext}`);

                    const newFile = vscode.Uri.parse(`untitled:${tmpfile}`);
                    vscode.workspace.openTextDocument(newFile).then(document => {
                        const edit = new vscode.WorkspaceEdit();
                        edit.insert(newFile, new vscode.Position(0,0), stepInput);
                        return vscode.workspace.applyEdit(edit).then(success => {
                            if (success) {
                                vscode.window.showTextDocument(document);
                            } else {
                                vscode.window.showInformationMessage('Error!');
                            }
                        });
                    });
                }
            },
            undefined,
            this._disposables
        );
    }

    public displayError(error: StitchError, extraBody?: string): void {
        const htmlBody = `<h1 class="error">${error.title}</h1>
                          <p>${error.description}</p>${extraBody || ''}`;
        this._webview.html = this._getHtml(htmlBody);
    }

    public displayResult(data: any, previewContext: PreviewContext, scenario: ScenarioSource): void {
        const contextHtml = this._getContextHtml(previewContext, scenario);

        if (!data.result) {
            if (data.ClassName ==='Core.Exceptions.StitchResponseSerializationException') {
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
                        <button onclick="vscode.postMessage({action: 'viewStepInput', content: '${stepId}' });">view as file</button>
                        <pre><code>${this._escapeHtml(requests[stepId].content)}</code></pre>
                    </div>`;
        }
        else if (step.$type === CONSTANTS.renderTemplateStepResultType) {
            return `<div>
                        <h4>${stepId}</h4>
                        <h5>Zip (base64)</h5>
                        <pre><code>${this._escapeHtml(requests[stepId].content.substr(1).slice(0,-1))}</code></pre>
                    </div>`;
        }
        else {
            return `<div>
                        <h4>${stepId}</h4>
                        <p>Started: ${step.started}</p>
                    </div>`;
        }
        

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
