import * as vscode from 'vscode';
import { CONSTANTS } from './constants';
import { unescapeResponseBody } from './utils/helpers';
import { PdfPreview } from './PdfPreview';
import { EditorSimulateIntegrationResponse } from './types/apiTypes';
import { HttpStepConfiguration } from './types/stepConfiguration';
import { RenderTemplateStepResult } from './types/stepResult';

export class StitchPreviewHelper {
    
    public static show(options: { filename: string; content: string; }): void {
        if (!options.content) { return; }

        const firstChar = options.content[0];
        let extension = '.txt';
        if (options.filename.endsWith(CONSTANTS.httpFileExtension)) { extension = ''; }
        else if (options.content.startsWith('<!DOCTYPE html>') || options.content.startsWith('<html>')) { extension = '.html'; }
        else if (firstChar === '<') { extension = '.xml'; }
        else if (firstChar === '{' || firstChar === '[') { extension = '.json'; }

        const untitledFile = vscode.Uri.parse(`untitled:${options.filename}${extension}`);
        this._updateRendered(untitledFile, options.content, true);
    }

    public static update(response: EditorSimulateIntegrationResponse): void {
        this._updateRenderedUntitled(response);
        this._updateRenderedPdf(response);
    }

    public static createHttpRequestContent(httpConfig: HttpStepConfiguration): string {
        let headers = '';
        if (httpConfig.headers) {
            headers = Object.keys(httpConfig.headers).map(key => `${key}: ${httpConfig.headers?.[key]}`).join('\r\n');
        }
        return `${httpConfig.method} ${httpConfig.url} HTTP/1.1\r\n` +
               `${headers}\r\n` +
               '\r\n' +
               `${httpConfig.template}`;
    }

    private static _updateRendered(untitledUri: vscode.Uri, content: string, show = false) {
        void vscode.workspace.openTextDocument(untitledUri).then(document => {
            const lastLine = document.lineAt(document.lineCount-1);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(untitledUri, new vscode.Range(new vscode.Position(0, 0), lastLine.range.end), content);
            return vscode.workspace.applyEdit(edit).then(success => {
                if (success && show) {
                    void vscode.window.showTextDocument(document, undefined, true);
                }
            });
        });
    }

    private static _updateRenderedUntitled(response: EditorSimulateIntegrationResponse) {
        const open = vscode.workspace.textDocuments.filter(t => t.uri.scheme === 'untitled' && t.fileName.startsWith('stitch-'));
        if (open.length === 0 || !response) {return;}

        open.forEach(o => {
            if (o.fileName.startsWith('stitch-response.')) {
                this._updateRendered(o.uri, unescapeResponseBody(response.result));
            } else {
                const match = /^stitch-step-request-(.*?)\./.exec(o.fileName);
                if (match?.length === 2) {
                    const stepConfig = response.stepConfigurations[match[1]];
                    if (o.fileName.endsWith(CONSTANTS.httpFileExtension)) {
                        const httpContent = this.createHttpRequestContent(<HttpStepConfiguration>stepConfig);
                        this._updateRendered(o.uri, httpContent);
                    } else {
                        this._updateRendered(o.uri, stepConfig.template.trim());
                    }
                }
            }
        });
    }

    private static _updateRenderedPdf(response: EditorSimulateIntegrationResponse) {

        for (const stepId of PdfPreview.renderedSteps) {
            if (response.integrationContext.steps[stepId]?.$type !== CONSTANTS.renderTemplateStepResultType) { 
                PdfPreview.disposeRenderedStep(stepId);
                continue;
            }
            const renderResponse = <RenderTemplateStepResult>response.integrationContext.steps[stepId];
            if (renderResponse.response.contentType !== 'application/pdf') { 
                PdfPreview.disposeRenderedStep(stepId);
                continue;
             }
            PdfPreview.setOrUpdatePdfData(stepId, renderResponse.response.content);
        }
    }
}
