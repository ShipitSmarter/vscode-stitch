import * as path from 'path';
import { CONSTANTS } from "./constants";
import {
    BaseStepConfiguration,
    BaseStepResult,
    CommandAction,
    HttpStepConfiguration,
    MailStepConfiguration,
    RenderTemplateStepConfiguration,
    RenderTemplateStepResult,
    SftpStepConfiguration,
    StepConfiguration,
    StepResult,
    StitchResponse,
} from "./types";

export namespace HtmlHelper {

    export function createHtml(response: StitchResponse): string {
        return `<div class="container">
                    ${_createStepsHtml(response)}
                    ${_createResponseHtml(response)}                    
                </div>
                <div class="quicknav"><strong>&nbsp;Nav</strong> ${_createNavHtml(response.integrationContext.steps)}</div>`;
    }

    export function escapeHtml(unsafe: string) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function _createStepsHtml(response: StitchResponse): string {
        var stepsHtml = Object.keys(response.integrationContext.steps)
            .map(key => { return _createStepHtml(
                response.integrationContext.steps[key],
                response.stepConfigurations[key] ?? <BaseStepConfiguration> { id: key, template: '' });
            }).join('');
        
        if (stepsHtml) {
            return `<h2>Steps</h2>${stepsHtml}`;
        }
        return '';
    }

    function _createResponseHtml(response: StitchResponse): string {
        const resultStatusCode = response.resultStatusCode ? response.resultStatusCode : 200;
        const actionCommand = `{action: ${CommandAction.viewIntegrationResponse} }`;
        const body =  `<pre><code>${JSON.stringify(response.result, null, 2)}</code></pre>`;

        return `<h2 id="integration_response">Response</h2>
                ${_createActionHtml('', resultStatusCode, '', actionCommand, body)}`;
    }

    function _createNavHtml(steps: Record<string, StepResult>): string {
        var stepsNav = Object.keys(steps).map(key => { return `<a href="#${key}">${key}</a>`; }).join('');
        return `${stepsNav}<a href="#integration_response">Response</a>`;
    }

    function _createStepHtml(step: StepResult, configuration: StepConfiguration) {
        switch (step.$type) {
            case CONSTANTS.httpStepResultTypeType:
                return _createActionStepHtml('HTTP', configuration, _getHttpStepHtml(<HttpStepConfiguration>configuration));
            case CONSTANTS.renderTemplateStepResultType:
                return _createActionStepHtml('RenderTemplate', configuration, _getRenderTemplateStepHtml(<RenderTemplateStepResult>step, <RenderTemplateStepConfiguration>configuration));
            case CONSTANTS.mailStepResultType:
                return _createActionStepHtml('Mail', configuration, _getMailStepHtml(<MailStepConfiguration>configuration));
            case CONSTANTS.sftpStepResultType:
                return _createActionStepHtml('SFTP', configuration, _getSftpStepHtml(<SftpStepConfiguration>configuration));
            case CONSTANTS.skippedStepResultType:
                return _createActionStepHtml('Skipped', configuration, '');
            default:
                return _createActionStepHtml('Unknown', configuration, _getDefaultStepHtml(step, configuration));
        }
    }

    function _createActionHtml(title: string, type:string, anchor: string, postMessageAction: string, body: string) {
        return `<div class="action" id="${anchor}">
                    <span class="title">${title}</span>
                    <span class="type">${type}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" 
                        class="file-icon" title="View as file" onclick="vscode.postMessage(${postMessageAction});"
                        viewBox="0 0 368.553 368.553" xml:space="preserve">
                        <path d="M239.68 0H42.695v368.553h283.164V86.811L239.68 0zm4.377 25.7 56.288 56.701h-56.288V25.7zM57.695 353.553V15h171.362v82.401h81.802v256.151H57.695v.001z"/>
                        <path d="M86.435 82.401H208.31v15H86.435zM86.435 151.122H282.12v15H86.435zM86.435 219.843H282.12v15H86.435zM86.435 288.563H282.12v15H86.435z"/>
                    </svg>
                    <div class="content">
                        ${body}
                    </div>
                </div>`;
    }

    
    function _createActionStepHtml(title: string, step: StepConfiguration, body: string) {
        return _createActionHtml(step.id, title, step.id, `{action: ${CommandAction.viewStepRequest}, content: '${step.id}' }`,
                    `${body}
                    <pre><code>${escapeHtml(step.template)}</code></pre>`);
    }

    function _getDefaultStepHtml(step: BaseStepResult, configuration: StepConfiguration) {
        return `<p>
                    Type:&nbsp;&nbsp;&nbsp;&nbsp;${step.$type}<br />
                    Started:&nbsp;${step.started}<br />
                    Success:&nbsp;${step.success}
                <p>
                <p>
                    Configuration:<br /><br />
                    ${JSON.stringify(configuration)}
                </p>`;
    }

    function _getHttpStepHtml(configuration: HttpStepConfiguration) {
        var html = `<p>${configuration.method} ${configuration.url}</p>`;
        if (configuration.headers) {
            html += `<p>${Object.keys(configuration.headers).map(key => `${key}:&nbsp;${configuration.headers![key]}<br />`).join('')}</p>`;
        };

        return html;
    }

    function _getRenderTemplateStepHtml(step: RenderTemplateStepResult, configuration: RenderTemplateStepConfiguration) {
        var stepHtml = '';
        if (configuration.additionalFiles) {
            stepHtml += `<dl>
                             <dt>Additional files</dt>
                             ${configuration.additionalFiles.map(f => `<dd>${f}</dd>`).join('')}
                         </dl>`;
        }
        if (step.response.isSuccessStatusCode) {
            stepHtml +=    `<button class="file-btn" onclick="vscode.postMessage({action: ${CommandAction.viewStepResponse}, content: '${configuration.id}' });">View PDF</button>`;
        }
        else {
            stepHtml +=    `<strong>OUTPUT | Error (${step.response.statusCode})</strong><br />
                            ${step.response.errorMessage}<br />`;
        }
        return stepHtml;
    }

    function _getMailStepHtml(configuration: MailStepConfiguration) {
        return `<p>
                    Subject:&nbsp;${configuration.subject}<br />
                    From:&nbsp;&nbsp;&nbsp;&nbsp;${configuration.from}<br />
                    To:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${configuration.to.join(', ')}
                </p>`;
    }

    function _getSftpStepHtml(configuration: SftpStepConfiguration) {
        return `<p>
                    Url:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${configuration.host}:${configuration.port}<br />
                    File:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${path.join(configuration.path ?? '', configuration.filename)}<br />
                    Username:&nbsp;${configuration.username}<br />
                    Password:&nbsp;${configuration.password}
                </p>`;
    }
}




