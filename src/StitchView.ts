import * as vscode from 'vscode';
import { ContextHandler } from './ContextHandler';
import { HtmlHelper } from './HtmlHelper';
import { ICommand, StitchError, StitchResponse, ErrorData } from './types';

export class StitchView {

    private _disposables: vscode.Disposable[] = [];

    public constructor(private _webview: vscode.Webview, private _extensionUri: vscode.Uri) {
        _webview.onDidReceiveMessage(
            (command: ICommand) => { ContextHandler.handlePreviewCommand(command, _extensionUri); },
            undefined,
            this._disposables
        );
    }

    public displayResult(data: StitchResponse): void {
        this._webview.html = this._getHtml(HtmlHelper.createHtml(data));
    }

    public displayResultError(errorData: ErrorData): void {
        if (errorData.ClassName === 'Core.Exceptions.StitchResponseSerializationException') {
            this.displayError({
                title: errorData.Message ?? 'Unexpected error',
                description: `<pre><code>${errorData.ResultBody}</code></pre><strong>Exception:</strong><br />${errorData.InnerException?.Message}`
            });
        }

        return this.displayError({
            title: 'Render error',
            description: errorData.message || `${errorData.Message}<br /><br />${errorData.StackTraceString}`
        });
    }

    public displayError(error: StitchError, extraBody?: string): void {
        extraBody = HtmlHelper.escapeHtml(extraBody || '');
        const htmlBody = `<h1 class="error">${error.title}</h1>
                          <p>${HtmlHelper.escapeHtml(error.description)}</p><p>${extraBody}</p>`;
        this._webview.html = this._getHtml(htmlBody);
    }

    public scrollToPosition(scrollPosition: number): void {
        void this._webview.postMessage({ command: 'setScrollPosition', scrollY: scrollPosition});
    }

    private _getHtml(htmlBody: string): string {
        const cspSource = this._webview.cspSource;
        const resolveAsUri = (...p: string[]): vscode.Uri => {
            return this._webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ...p));
        };
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Stitch Preview</title>

                <meta http-equiv="Content-Security-Policy" content="
                    default-src 'none';
                    style-src ${cspSource};
                    script-src 'unsafe-inline' ${cspSource};
                    img-src ${cspSource} https:;">
                <link href="${resolveAsUri('assets', 'style.css')}" rel="stylesheet">
                <script>
                    window.acquireVsCodeApi = acquireVsCodeApi;
                </script>
            </head>
            <body>
                ${htmlBody}
                <script>
                    const vscode = window.acquireVsCodeApi();
                </script>
                <script src="${resolveAsUri('assets', 'preview.js')}"></script>
            </body>
            </html>`;
    }
}
