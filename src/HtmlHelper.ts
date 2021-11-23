import { CONSTANTS } from "./constants";
import { CommandAction, HttpStepConfiguration, HttpStepResult, RenderTemplateStepConfiguration, RenderTemplateStepResult, StepConfiguration, StepResult } from "./types";

export namespace HtmlHelper {
    export function getStepHtml(step: StepResult, stepId: string, configuration: StepConfiguration) {
        switch (step.$type) {
            case CONSTANTS.httpStepResultTypeType:
                return _getHttpStepHtml(<HttpStepResult>step, stepId, <HttpStepConfiguration>configuration);
            case CONSTANTS.renderTemplateStepResultType:
                return _getRenderTemplateStepHtml(<RenderTemplateStepResult>step, stepId, <RenderTemplateStepConfiguration>configuration);
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
    
    function _getHttpStepHtml(step: HttpStepResult, stepId: string, configuration: HttpStepConfiguration) {
        return `<div>
                    <h4>${stepId}</h4>
                    <p>${configuration.method} - ${configuration.url}</p>
                    ${Object.keys(configuration.headers).map(key => `<p><strong>${key}</strong>&nbsp;${configuration.headers[key]}</p>`)}
                    <button onclick="vscode.postMessage({action: ${CommandAction.viewStepRequest}, content: '${stepId}' });">view as file</button>
                    <pre><code>${escapeHtml(configuration.template)}</code></pre>
                </div>`;
    }
    
    function _getRenderTemplateStepHtml(step: RenderTemplateStepResult, stepId: string, configuration: RenderTemplateStepConfiguration) {
        var stepHtml = `<div>
                            <h4>${stepId}</h4>
                            <h5>INPUT | Html</h5>
                            <pre><code>${escapeHtml(configuration.template)}</code></pre>
                            <h6>Additional files</h6>
                            <ul>${configuration.additionalFiles.map(f => `<li>${f}</li>`)}</ul>`;
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
}