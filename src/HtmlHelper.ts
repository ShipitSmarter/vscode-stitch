import { CONSTANTS } from "./constants";
import { CommandAction, HttpStepConfiguration, HttpStepResult, RenderTemplateStepConfiguration, RenderTemplateStepResult, StepConfiguration, StepResult } from "./types";

export namespace HtmlHelper {
    export function getStepHtml(step: StepResult, configuration: StepConfiguration) {
        switch (step.$type) {
            case CONSTANTS.httpStepResultTypeType:
                return _getActionStepHtml('HTTP', configuration, _getHttpStepHtml(<HttpStepConfiguration>configuration));
            case CONSTANTS.renderTemplateStepResultType:
                return _getActionStepHtml('RenderTemplate', configuration, _getRenderTemplateStepHtml(<RenderTemplateStepResult>step, <RenderTemplateStepConfiguration>configuration));
            default:
                return _getDefaultStepHtml(step);
        }
    }

    export function getActionHtml(title: string, type:string, postMessageAction: string, body: string) {
        return `<div class="action">
                    <span class="title">${title}</span>
                    <span class="type">${type}</span>                    
                    <svg xmlns="http://www.w3.org/2000/svg" 
                        class="file-icon" title="View as file" onclick="vscode.postMessage(${postMessageAction});"
                        viewBox="0 0 368.553 368.553" style="enable-background:new 0 0 368.553 368.553;" xml:space="preserve">
                        <path d="M239.68 0H42.695v368.553h283.164V86.811L239.68 0zm4.377 25.7 56.288 56.701h-56.288V25.7zM57.695 353.553V15h171.362v82.401h81.802v256.151H57.695v.001z"/>
                        <path d="M86.435 82.401H208.31v15H86.435zM86.435 151.122H282.12v15H86.435zM86.435 219.843H282.12v15H86.435zM86.435 288.563H282.12v15H86.435z"/>
                    </svg>
                    <div class="content">
                        ${body}
                    </div>
                </div>`;
    }

    function _getActionStepHtml(title: string, step: StepConfiguration, body: string) {
        return getActionHtml(step.id, title, `{action: ${CommandAction.viewStepRequest}, content: '${step.id}' }`,
                    `${body}
                    <pre><code>${escapeHtml(step.template)}</code></pre>`);
    }

    export function escapeHtml(unsafe: string) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function _getDefaultStepHtml(step: StepResult) {
        return `<p>Started: ${step.started}</p>`;
    }
    
    function _getHttpStepHtml(configuration: HttpStepConfiguration) {
        return `<p>${configuration.method} ${configuration.url}</p>
                <p>${Object.keys(configuration.headers).map(key => `${key}:&nbsp;${configuration.headers[key]}<br />`).join('')}</p>`;
    }

    function _getRenderTemplateStepHtml(step: RenderTemplateStepResult, configuration: RenderTemplateStepConfiguration) {
        var stepHtml = `<strong>Additional files</strong><br />
                        ${configuration.additionalFiles.map(f => `${f}<br /><br />`)}`;
        if (step.response.isSuccessStatusCode) {
            stepHtml +=    `<button class="file-btn" onclick="vscode.postMessage({action: ${CommandAction.viewStepResponse}, content: '${configuration.id}' });">View PDF</button>`;
        }
        else {
            stepHtml +=    `<strong>OUTPUT | Error (${step.response.statusCode})</strong><br />
                            ${step.response.errorMessage}<br />`;
        }
        return stepHtml;
    }
}