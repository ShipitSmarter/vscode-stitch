import * as vscode from 'vscode';
import { CONSTANTS } from './constants';
import { PdfPreview } from './PdfPreview';
import { RenderTemplateStepResult, StitchResponse } from './types';

export class RenderedHelper {

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

    public static update(response: StitchResponse): void {
        this._updateRenderedUntitled(response);
        this._updateRenderedPdf(response);
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

    private static _updateRenderedUntitled(response: StitchResponse) {
        const open = vscode.workspace.textDocuments.filter(t => t.uri.scheme === 'untitled' && t.fileName.startsWith('stitch-'));
        if (open.length === 0 || !response) {return;}

        open.forEach(o => {
            if (o.fileName.startsWith('stitch-response.')) {
                this._updateRendered(o.uri, JSON.stringify(response.result, null, 2));
            } else {
                const match = /^stitch-step-request-(.*?)\./.exec(o.fileName);
                if (match?.length === 2) {
                    this._updateRendered(o.uri, response.stepConfigurations[match[1]].template.trim());
                }
            }
        });
    }

    private static _updateRenderedPdf(response: StitchResponse) {

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
