import { CONSTANTS } from "./constants";
import { CommandAction, HttpStepResult, MailStepResult, RenderTemplateStepResult, StepRequest, StepResult } from "./types";

export namespace HtmlHelper {
    export function getStepHtml(step: StepResult, stepId: string, requests: Record<string, StepRequest>) {
        switch (step.$type) {
            case CONSTANTS.httpStepResultTypeType:
                return _getHttpStepHtml(<HttpStepResult>step, stepId, requests[stepId]);
            case CONSTANTS.renderTemplateStepResultType:
                return _getRenderTemplateStepHtml(<RenderTemplateStepResult>step, stepId, requests[stepId]);
            default:
                return _getDefaultStepHtml(step, stepId);
        }
    }

    export function escapeHtml(unsafe: string) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function _getDefaultStepHtml(step: StepResult, stepId: string) {
        return `<div>
                    <h4>${stepId}</h4>
                    <p>Started: ${step.started}</p>
                </div>`;
    }
    
    function _getHttpStepHtml(step: HttpStepResult, stepId: string, request: StepRequest) {
        return `<div>
                    <h4>${stepId}</h4>
                    <p>${step.request.method} - ${step.request.url}</p>
                    <button onclick="vscode.postMessage({action: ${CommandAction.viewStepRequest}, content: '${stepId}' });">view as file</button>
                    <pre><code>${escapeHtml(request.content)}</code></pre>
                </div>`;
    }
    
    function _getRenderTemplateStepHtml(step: RenderTemplateStepResult, stepId: string, request: StepRequest) {
        var stepHtml = `<div>
                            <h4>${stepId}</h4>
                            <h5>INPUT | Zip (base64)</h5>
                            <pre><code>${_trimQuotationMarks(request.content)}</code></pre>`;
        if (step.response.isSuccessStatusCode) {
            stepHtml +=    `<h5>OUTPUT | Pdf (base64)</h5>
                            <button onclick="vscode.postMessage({action: ${CommandAction.viewStepResponse}, content: '${stepId}' });">view as file</button>
                            <pre><code>${step.response.content}</code></pre>`;
        }
        else {
            stepHtml +=    `<h5>OUTPUT | Error (${step.response.statusCode})
                            <p>${step.response.errorMessage}</p>`;
        }
        stepHtml += '</div>';
        return stepHtml;
    }

    function _trimQuotationMarks(untrimmed: string) {
        let result = untrimmed;
        if (untrimmed.startsWith('"')) {
            result = result.substr(1);
        }
        if (untrimmed.endsWith('"')) {
            result = result.slice(0, -1);
        }

        return result;
    }
}