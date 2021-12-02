import { Context, ICommand } from "./types";
import * as vscode from 'vscode';
import { StitchPreview } from "./StitchPreview";
import { COMMANDS, CONSTANTS, MESSAGES } from "./constants";
import { Disposable } from "./dispose";
import { FileScrambler } from "./FileScrambler";
import { PdfPreview } from "./PdfPreview";
import { debounce, delay } from "./helpers";
import { StitchTreeProvider } from "./StitchTreeProvider";


export class ContextHandler extends Disposable implements vscode.Disposable {

    private static _treeProvider = new StitchTreeProvider();
    private static _current?: ContextHandler;

    private _context?: Context;
    private _preview?: StitchPreview;
    private _statusBar: vscode.StatusBarItem;
    private _debouncedTextUpdate: () => void;

    private constructor() {
        super();

        this._debouncedTextUpdate = debounce(() => this._updateContext(), this._getConfigDebounceTimeout());
        this._context = this._createContext();
        if (this._context) {
            void vscode.commands.executeCommand('setContext', CONSTANTS.contextAvailableContextKey, true);
        }

        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this._statusBar.command = COMMANDS.selectScenario;
        this._updateStatusBar();

        const onDidChangeConfigurationListener = vscode.workspace.onDidChangeConfiguration(e => {
            this._onUpdateConfiguration(e);
        });

        const onDidChangeActiveTextEditorListener = vscode.window.onDidChangeActiveTextEditor((e): void => {
            e && ['file'].includes(e.document.uri.scheme) && this._updateContextOnChangeActiveEditor();
        });

        const onDidChangeTextEditorListener = vscode.workspace.onDidChangeTextDocument((e): void => {
            if (e.document.isUntitled) { return; }
            this._debouncedTextUpdate();
        });


        const onDidChangeVisibleTextEditorsListener = vscode.window.onDidChangeVisibleTextEditors(async (): Promise<void> => {
            // delay is needed to wait for textDocuments on workspace to be updated
            await delay(50);
            const activeEditorCount = vscode.workspace.textDocuments.filter(t => ['file', 'untitled'].includes(t.uri.scheme)).length;
            if (activeEditorCount === 0) {
                this._clearContext();
            }
        });

        this._register(this._statusBar);
        this._register(onDidChangeConfigurationListener);
        this._register(onDidChangeActiveTextEditorListener);
        this._register(onDidChangeTextEditorListener);
        this._register(onDidChangeVisibleTextEditorsListener);
    }

    public static create(): vscode.Disposable {
        return this._ensureContext();
    }

    public dispose(): void {
        void vscode.commands.executeCommand('setContext', CONSTANTS.contextAvailableContextKey, false);
        super.dispose();
    }

    public static getContext(): Context | undefined {
        return this._current?._context;
    }

    public static getTreeProvider(): StitchTreeProvider {
        this._ensureContext();
        return this._treeProvider;
    }

    public static showPreview(extensionUri: vscode.Uri): void {

        const context = this._ensureContext();

        const currentPreview = context._preview;

        if (currentPreview) {
            currentPreview.reveal();
            return;
        }

        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            void vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

        context._preview = context._register(StitchPreview.create(extensionUri, endpoint));
        context._register(context._preview.onDidDispose(() => this._onPreviewDidDspose()));
        void vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, true);
    }

    public static selectScenario(): void {
        if (!this._current?._context) {
            return;
        }

        const normalizeResult = FileScrambler.getScenarios(this._current._context.integrationFilePath);
        if (!normalizeResult.success) {
            void vscode.window.showErrorMessage('Some error occured for selecting a scenario!\nMake sure you have implemented the scenario.');
            return;
        }

        const scenarios = normalizeResult.scenarios;
        const quickPickItems = Object.keys(scenarios).sort();
        void vscode.window.showQuickPick(quickPickItems).then((name): void => {
            if (name && this._current?._context) {
                this._current._context.activeScenario = scenarios[name];
                this._treeProvider.refresh();
                this._current._updateStatusBar();
                if (this._current._preview) {
                    this._current._preview.update();
                }
            }
        });
    }

    public static handlePreviewCommand(command: ICommand, extensionUri: vscode.Uri): void {
        if (!this._current?._preview) {
            return;
        }

        this._current._preview.handleCommand(command, extensionUri);
    }

    private _updateStatusBar() {
        if (this._context) {
            this._statusBar.show();
            this._statusBar.text = `${CONSTANTS.statusbarTitlePrefix}${this._context.activeScenario.name}`;
        } else {
            this._statusBar.hide();
        }
    }

    private _clearContext() {
        void vscode.commands.executeCommand('setContext', CONSTANTS.contextAvailableContextKey, false);
        this._context = undefined;
        this._updateStatusBar();
        PdfPreview.disposeAll();
        if (this._preview) { this._preview.dispose(); }
        ContextHandler._treeProvider.refresh();
    }

    private static _ensureContext(): ContextHandler {

        if (!this._current){
            this._current = new ContextHandler();
        }

        return this._current;
    }

    private _createContext(): Context | undefined {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.isUntitled) {
            return;
        }

        const activeFile = {
            filepath: activeEditor.document.fileName,
            filecontent: activeEditor.document.getText()
        };
        return FileScrambler.determineContext(activeFile, this._context);
    }

    private _onUpdateConfiguration(e: vscode.ConfigurationChangeEvent) {
        if (e.affectsConfiguration(CONSTANTS.configKeyEndpointUrl)) {
            this._onUpdateEndpoint();
        }
        if (e.affectsConfiguration(CONSTANTS.configKeyDebounceTimeout)) {
            this._onUpdateDebounceTimeout();
        }
    }

    private _onUpdateEndpoint() {

        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            void vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

        if (this._preview) {
            this._preview.setEndpoint(endpoint);
        }
        ContextHandler._treeProvider.setEndpoint(endpoint);
        
        void vscode.window.showInformationMessage('The Stitch editor endpoint has been updated to: ' + endpoint);
    }

    private _onUpdateDebounceTimeout() {
        const timeout = this._getConfigDebounceTimeout();
        this._debouncedTextUpdate = debounce(() => this._updateContext(), timeout);

        void vscode.window.showInformationMessage(`The Stitch debounce timeout has been updated to: ${timeout} ms`);
    }

    private static _onPreviewDidDspose() {
        if (!this._current) {
            return;
        }

        void vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, false);
        this._current._preview = undefined;
    }

    private _getConfigDebounceTimeout() : number {
        const debounceTimeout = vscode.workspace.getConfiguration().get<number>(CONSTANTS.configKeyDebounceTimeout);
        if (!debounceTimeout) {
            void vscode.window.showErrorMessage(MESSAGES.debounceTimeoutNotConfigured);
            return CONSTANTS.defaultDebounceTimeout;
        }
        return debounceTimeout;
    }

    private _updateContextOnChangeActiveEditor(): void {
        const previousContext = this._context;
        const newContext = this._createContext();
        if (previousContext?.integrationFilePath !== newContext?.integrationFilePath){
            this._updateContext();
        }
    }

    private _updateContext(): void {
        const previousContext = this._context;
        this._context = this._createContext();

        if (!previousContext && !this._context) {
            this._clearContext();
            return;
        }

        if (this._context) {
            void vscode.commands.executeCommand('setContext', CONSTANTS.contextAvailableContextKey, true);

            if (this._context.integrationFilePath !== previousContext?.integrationFilePath) {
                PdfPreview.disposeAll();
            }
        } else {
            this._context = previousContext;
        }      
        
        this._updateStatusBar();

        try {
            ContextHandler._treeProvider.refresh(); 
        } catch (e) {
            if (e instanceof Error) {
                void vscode.window.showErrorMessage(e.message);
            }
        }

        if (this._preview) {
            try {
                this._preview.update();
            } catch (e) {
                if (e instanceof Error) {
                    void vscode.window.showErrorMessage(e.message);
                }
            }
        }
    }
}
