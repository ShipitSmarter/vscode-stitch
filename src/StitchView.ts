import * as vscode from 'vscode';
import { HttpStepResult, PreviewContext, ScenarioSource, StepRequest, StepResult, StitchError, StitchResponse } from './types';

export class StitchView {

    private _stylesMainUri: vscode.Uri;

    constructor(private _webview: vscode.Webview, extensionUri: vscode.Uri) {
        this._stylesMainUri = _webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'style.css'));
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

        var resultValue = response.result && response.result.value ? response.result.value : response.result;
        var resultStatusCode = response.result && response.result.statusCode ? response.result.statusCode : 200;

        const htmlBody = `<h1>Output</h1>
                          <pre><code>${JSON.stringify(resultValue, null, 2)}</code></pre>
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

    private _getStepHtml(stepId: string, step: StepResult | HttpStepResult, requests: Record<string, StepRequest>) {
        
        if (step.$type !== 'Core.Entities.StepResults.HttpStepResult, Core') {
            return `<div>
                        <h4>${stepId}</h4>
                        <p>Started: ${step.started}</p>
                    </div>`;
        }
        
        const httpStep = <HttpStepResult>step;
        return `<div>
                    <h4>${stepId}</h4>
                    <p>${httpStep.request.method} - ${httpStep.request.url}</p>
                    <pre><code>${this._escapeHtml(requests[stepId].content)}</code></pre>
                </div>`;
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
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; img-src ${cspSource} https:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${this._stylesMainUri}" rel="stylesheet">
                <title>Stitch Preview</title>				
            </head>
            <body>${htmlBody}</body>
            </html>`;
    }
}
