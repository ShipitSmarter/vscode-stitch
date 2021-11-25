import { Context, ICommand } from "./types";
import * as vscode from 'vscode';
import { StitchPreview } from "./StitchPreview";
import { CONSTANTS, MESSAGES } from "./constants";
import { Disposable } from "./dispose";
import { FileScrambler } from "./FileScrambler";
import { PdfPreview } from "./PdfPreview";
import { debounce } from "./debounce";


export class ContextHandler extends Disposable implements vscode.Disposable {

    private static _current?: ContextHandler;

    private _context?: Context;
    private _preview?: StitchPreview;
    private _debouncedTextUpdate: () => void;


    constructor(textEditor?: vscode.TextEditor) {
        super();

        this._debouncedTextUpdate = debounce(() => this._updateContext(), this._getConfigDebounceTimeout());
        this._createContext(textEditor);

        const onDidChangeConfigurationListener = vscode.workspace.onDidChangeConfiguration(e => {
            this._onUpdateConfiguration(e);
        });

        const onDidChangeActiveTextEditorListener = vscode.window.onDidChangeActiveTextEditor((e): void => {
            e && ['file'].includes(e.document.uri.scheme) && this._updateContext(e);
        });

        const onDidChangeTextEditorListener = vscode.workspace.onDidChangeTextDocument((_e): void => {
            if (_e.document.isUntitled) { return; }
            this._debouncedTextUpdate();
        });

        this._register(onDidChangeConfigurationListener);
        this._register(onDidChangeActiveTextEditorListener);   
        this._register(onDidChangeTextEditorListener);    
    }

    dispose() {
        super.dispose();
    }

    public static getContext(): Context | undefined {
        return this._current?._context;
    }

    public static showPreview(extensionUri: vscode.Uri, activeTextEditor: vscode.TextEditor | undefined): any {
		
        this._ensureContext(activeTextEditor);

        const currentPreview = this._current!._preview;

        if (currentPreview) {
            currentPreview.reveal();
            return;
        }

        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

        

        this._current!._preview = StitchPreview.create(extensionUri, endpoint);
        this._current?._register(this._current!._preview!.onDidDispose(() => this._onPreviewDidDspose()));
	}

    public static selectScenario(): void {
        if (!this._current?._context) {
            return;
        }

        const normalizeResult = FileScrambler.getScenarios(this._current._context.integrationFilePath);
        if (!normalizeResult.success) {
            vscode.window.showErrorMessage('Some error occured for selecting a scenario!\nMake sure you have implemented the scenario.');
            return;
        }

        const scenarios = normalizeResult.scenarios;
        const quickPickItems = scenarios.map(x => x.name).sort();
        vscode.window.showQuickPick(quickPickItems).then((x): void => {
            if (x && this._current?._preview) {
                this._current._context!.activeScenario = scenarios.find(s => s.name === x)!;
                if (this._current._preview) {
                    this._current._preview.update();
                }
                // TODO: Update tree
            }
        });
    }

    public static handlePreviewCommand(command: ICommand, extensionUri: vscode.Uri) {
        if (!this._current?._preview) {
            return;
        }

        this._current._preview.handleCommand(command, extensionUri);
    }

    // TODO: Temp solution, should be removed
    public static getPreviewResponse() {
        return this._current?._preview?.currentResponse();
    }

    private static _ensureContext(textEditor: vscode.TextEditor | undefined) {

        if (this._current){
            return;
        }

        this._current = new ContextHandler(textEditor);
    }

    private _createContext(textEditor: vscode.TextEditor | undefined) {
        const activeEditor = textEditor || vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.isUntitled) {
            return;
        }

        const activeFile = {
            filepath: activeEditor.document.fileName,
            filecontent: activeEditor.document.getText()
        };
        this._context = FileScrambler.determineContext(activeFile, this._context);
    }

    private _onUpdateConfiguration(e: vscode.ConfigurationChangeEvent) {
        if (e.affectsConfiguration(CONSTANTS.configKeyEndpointUrl)) {
            this._onUpdateEndoint();
        }
        if (e.affectsConfiguration(CONSTANTS.configKeyDebounceTimeout)) {
            this._onUpdateDebounceTimeout();
        }
    }

    private _onUpdateEndoint() {

        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

        if (this._preview) {
            this._preview.setEndpoint(endpoint);
        }
        
        vscode.window.showInformationMessage('The Stitch editor endpoint has been updated to: ' + endpoint);
    }

    private _onUpdateDebounceTimeout() {
        const timeout = this._getConfigDebounceTimeout();
        this._debouncedTextUpdate = debounce(() => this._updateContext(), timeout);

        vscode.window.showInformationMessage('The Stitch debounce timeout has been updated to: ' + timeout + ' ms');
    }

    private static _onPreviewDidDspose() {
        if (!this._current) {
            return;
        }

        this._current._preview = undefined;
        this._current.dispose();
        this._current = undefined;
    }

    private _getConfigDebounceTimeout() : number {
        const debounceTimeout = vscode.workspace.getConfiguration().get<number>(CONSTANTS.configKeyDebounceTimeout);
        if (!debounceTimeout) {
            vscode.window.showErrorMessage(MESSAGES.debounceTimeoutNotConfigured);
            return CONSTANTS.defaultDebounceTimeout;
        }
        return debounceTimeout;
    }

    private _updateContext(textEditor?: vscode.TextEditor): void {
        const previousContext = this._context;
        this._createContext(textEditor);

        if (!previousContext && !this._context) {
            vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, false);
            PdfPreview.disposeAll();
            return;
        }

        if (this._context) {
            vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, true);

            if (this._context.integrationFilePath !== previousContext?.integrationFilePath) {
                PdfPreview.disposeAll();
            }

        } else {
            this._context = previousContext;
        }

        if (this._preview) {
            this._preview.update();
        }
    }
}