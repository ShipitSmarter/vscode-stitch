import * as path from 'path';
import * as vscode from 'vscode';
import { CONSTANTS } from "./constants";
import { unescapeResponseBody } from './utils/helpers';
import { CommandAction } from "./types";
import { EditorSimulateIntegrationResponse, IntegrationResult, StitchError } from './types/apiTypes';
import { BaseStepConfiguration, HttpMulipartStepConfiguration, HttpStepConfiguration, MailStepConfiguration, RenderTemplateStepConfiguration, SftpStepConfiguration,  StepConfiguration, Base64EncodeStepConfiguration, CacheLoadStepConfiguration, CacheStoreStepConfiguration} from './types/stepConfiguration';
import { BaseStepResult, LoopStepResult, RenderTemplateStepResult, StepResult } from './types/stepResult';

export class StitchPreviewHtmlBuilder {

    public constructor(private _cspSource: string, private _resolveAsUri: (...p: string[]) => vscode.Uri) { }

    public createHtml(response: EditorSimulateIntegrationResponse): string {
        return this._createHtmlWrapper(
            `<div class="container">
                ${_createStepsHtml(response)}
                ${_createResponseHtml(response)}
            </div>
            <div class="quicknav"><strong>&nbsp;Nav</strong> ${_createNavHtml(response.integrationContext.steps)}</div>`
        );
    }

    public createErrorHtml(error: StitchError, extraBody?: string): string {
        extraBody = StitchPreviewHtmlBuilder.escapeHtml(extraBody || '');
        const htmlBody = `<h1 class="error">${error.title}</h1>
                          <p>${StitchPreviewHtmlBuilder.escapeHtml(error.description)}</p><p>${extraBody}</p>`;
        return this._createHtmlWrapper(htmlBody);
    }

    public static escapeHtml(unsafe: string): string {
        if (!unsafe) { return unsafe; }
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    private _createHtmlWrapper(htmlBody: string): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Stitch Preview</title>
    
                <meta http-equiv="Content-Security-Policy" content="
                    default-src 'none';
                    style-src ${this._cspSource};
                    script-src 'unsafe-inline' ${this._cspSource};
                    img-src ${this._cspSource} https:;">
                <link href="${this._resolveAsUri('assets', 'style.css')}" rel="stylesheet">
                <script>
                    window.acquireVsCodeApi = acquireVsCodeApi;
                </script>
            </head>
            <body>
                ${htmlBody}
                <script>
                    const vscode = window.acquireVsCodeApi();
                </script>
                <script src="${this._resolveAsUri('assets', 'preview.js')}"></script>
            </body>
            </html>`;
    }
}

function _createStepsHtml(response: EditorSimulateIntegrationResponse): string {
    const stepsHtml = Object.keys(response.integrationContext.steps)
        .map(key => {
            return _createStepHtml(
                response.integrationContext.steps[key],
                response.stepConfigurations[key] ?? <BaseStepConfiguration>{ id: key, template: '' });
        }).join('');

    if (stepsHtml) {
        return `<h2>Steps</h2>${stepsHtml}`;
    }
    return '';
}

function _createResponseHtml(response: EditorSimulateIntegrationResponse): string {
    const actionCommand = `{action: ${CommandAction.viewIntegrationResponse} }`;


    let body = `<pre><code>${_getResponseBody(response.result)}</code></pre>`;

    if (response.result.headers) {
        body = `<p>${Object.keys(response.result.headers).map(key => `${key}:&nbsp;${response.result.headers?.[key]}<br />`).join('')}</p>
                ${body}`;
    }

    return `<h2 id="integration_response">Response</h2>
            ${_createActionHtml(`${response.result.statusCode}`, response.result.outputType, '', actionCommand, body)}`;
}

function _createNavHtml(steps: Record<string, StepResult>): string {
    const stepsNav = Object.keys(steps).map(key => { return `<a href="#${key}">${key}</a>`; }).join('');
    return `${stepsNav}<a href="#integration_response">Response</a>`;
}

function _createStepHtml(step: StepResult, configuration: StepConfiguration) {
    switch (step.$type) {
        case CONSTANTS.httpStepResultTypeType:
            return _createActionStepHtml('HTTP', configuration, 
                configuration.$type === CONSTANTS.httpMultipartStepConfigurationType
                ? _getHttpMultipartStepHtml(<HttpMulipartStepConfiguration>configuration) 
                : _getHttpStepHtml(<HttpStepConfiguration>configuration));
        case CONSTANTS.renderTemplateStepResultType:
            return _createActionStepHtml('RenderTemplate', configuration, _getRenderTemplateStepHtml(<RenderTemplateStepResult>step, <RenderTemplateStepConfiguration>configuration));
        case CONSTANTS.mailStepResultType:
            return _createActionStepHtml('Mail', configuration, _getMailStepHtml(<MailStepConfiguration>configuration));
        case CONSTANTS.sftpStepResultType:
            return _createActionStepHtml('SFTP', configuration, _getSftpStepHtml(<SftpStepConfiguration>configuration));
        case CONSTANTS.skippedStepResultType:
            return _createActionStepHtml('Skipped', configuration, '');
        case CONSTANTS.loopStepResultType:
            return _createActionStepHtml('Loop', configuration, _getLoopStepHtml(<LoopStepResult>step));
        case CONSTANTS.base64EncodeStepResultType:
            return _createActionStepHtml('Base64Encode', configuration, _getBase64EncodeStepHtml(<Base64EncodeStepConfiguration>configuration));
        case CONSTANTS.cacheLoadStepResultType:
            return _createActionStepHtml('CacheLoad', configuration, _getCacheLoadStepHtml(<CacheLoadStepConfiguration>configuration));
        case CONSTANTS.cacheStoreStepResultType:
            return _createActionStepHtml('CacheStore', configuration, _getCacheStoreStepHtml(<CacheStoreStepConfiguration>configuration));
        default:
            return _createActionStepHtml('Unknown', configuration, _getDefaultStepHtml(step, configuration));
    }
}

function _createActionHtml(title: string, type: string, anchor: string, postMessageAction: string, body: string) {
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
    let templateCode = StitchPreviewHtmlBuilder.escapeHtml(step.template);
    if (step.$type === CONSTANTS.httpMultipartStepConfigurationType) {
        templateCode = "Please use the 'Create HTTP request' button to view entire content";
    }

    let actionHtmlBody = body;
    if (step.$type !== CONSTANTS.cacheLoadStepConfigurationType) {
        actionHtmlBody += `
        <pre><code>${templateCode}</code></pre>
        `;
    }

    return _createActionHtml(step.id, title, step.id, `{action: ${CommandAction.viewStepRequest}, content: '${step.id}' }`, actionHtmlBody);
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
    let html = `<p>${configuration.method} ${configuration.url}</p>`;
    if (configuration.headers) {
        html += `<p>${Object.keys(configuration.headers).map(key => `${key}:&nbsp;${configuration.headers?.[key]}<br />`).join('')}</p>`;
    }
    if (configuration.encodingName) {
        html += `<p>Encoding name:&nbsp;${configuration.encodingName}</p>`;
    }
    html += `<button class="file-btn" onclick="vscode.postMessage({action: ${CommandAction.createHttpRequest}, content: '${configuration.id}' });">Create HTTP request</button>`;

    return html;
}

function _getHttpMultipartStepHtml(configuration: HttpMulipartStepConfiguration) {
    let html = `<p>${configuration.method} ${configuration.url}</p>`;
    if (configuration.headers) {
        html += `<p>${Object.keys(configuration.headers).map(key => `${key}:&nbsp;${configuration.headers?.[key]}<br />`).join('')}</p>`;
    }
    html += `<p>Parts: ${configuration.parts.length}</p>`;
    html += `<button class="file-btn" onclick="vscode.postMessage({action: ${CommandAction.createHttpMultipartRequest}, content: '${configuration.id}' });">Create HTTP request</button>`;

    return html;
}

function _getRenderTemplateStepHtml(step: RenderTemplateStepResult, configuration: RenderTemplateStepConfiguration) {
    let html = '';
    if (configuration.additionalFiles) {
        html += `<dl>
                         <dt>Additional files</dt>
                         ${configuration.additionalFiles.map(f => `<dd>${f}</dd>`).join('')}
                     </dl>`;
    }
    if (configuration.encodingName) {
        html += `<p>Encoding name:&nbsp;${configuration.encodingName}</p>`;
    }
    if (step.response.isSuccessStatusCode) {
        html += `<button class="file-btn" onclick="vscode.postMessage({action: ${CommandAction.viewStepResponse}, content: '${configuration.id}' });">View PDF</button>`;
    }
    else {
        html += `<strong>OUTPUT | Error (${step.response.statusCode})</strong><br />
                        ${step.response.errorMessage}<br />`;
    }
    return html;
}

function _getMailStepHtml(configuration: MailStepConfiguration) {
    return `<p>
                Subject:&nbsp;${configuration.subject}<br />
                From:&nbsp;&nbsp;&nbsp;&nbsp;${configuration.from}<br />
                To:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${configuration.to.join(', ')}
            </p>`;
}

function _getBase64EncodeStepHtml(configuration: Base64EncodeStepConfiguration) {
    return `<p>
                Encoding name:&nbsp;${configuration.encodingName}<br />
            <p>`;
}

function _getCacheLoadStepHtml(configuration: CacheLoadStepConfiguration) {
    return `<p>
                Key:&nbsp;${configuration.key}<br />
            <p>`;
}

function _getCacheStoreStepHtml(configuration: CacheStoreStepConfiguration) {
    return `<p>
                Key:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${configuration.key}<br />
                Allow overwrite:&nbsp;${configuration.allowOverwrite}<br />
            <p>`;
}

function _getSftpStepHtml(configuration: SftpStepConfiguration) {
    let html = `<p>
                Url:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${configuration.host}:${configuration.port}<br />
                File:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${path.join(configuration.path ?? '', configuration.filename)}<br />
                Username:&nbsp;${configuration.username}<br />
                Password:&nbsp;${configuration.password}
            </p>`;
    if (configuration.encodingName) {
        html += `<p>Encoding name:&nbsp;${configuration.encodingName}</p>`;
    }
    return html;
}

function _getLoopStepHtml(step: LoopStepResult) {
    const html = `<p>
                    Iteration count:&nbsp;${step.count}<br />
                  </p>`;
    return html;
}

/**
 * NOTE: we could do some fancy parsing/formatting here, But this is not done so the actual output is displayed!
 * @param result 
 * @returns HTML that can be displayed/rendered
 */
function _getResponseBody(result: IntegrationResult): string {

    const unescapedBody = unescapeResponseBody(result);
    // when displaying we should escape html characters
    return StitchPreviewHtmlBuilder.escapeHtml(unescapedBody);
}
