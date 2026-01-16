import { Context, ICommand } from "./types";
import * as vscode from 'vscode';
import { StitchPreview } from "./StitchPreview";
import { COMMANDS, CONSTANTS, MESSAGES } from "./constants";
import { Disposable } from "./utils/dispose";
import { FileScrambler } from "./utils/FileScrambler";
import { PdfPreview } from "./PdfPreview";
import { debounce, delay } from "./utils/helpers";
import { StitchTreeProvider } from "./StitchTreeProvider";
import { ScenarioHelper } from "./utils/ScenarioHelper";
import { EditorSimulateIntegrationResponse, ErrorData, IntegrationRequestModel } from "./types/apiTypes";
import { IngrationRequestBuilder } from "./utils/IntegrationRequestBuilder";
import axios from "axios";
import { TreeBuilder } from "./utils/TreeBuilder";

export class ContextHandler extends Disposable implements vscode.Disposable {

    private static _treeProvider = new StitchTreeProvider();
    private static _current?: ContextHandler;

    private _context?: Context;
    private _preview?: StitchPreview;
    private _simulationResponse?: ResponseData;
    private _statusBar: vscode.StatusBarItem;
    private _channel: vscode.OutputChannel;
    private _endPoint?: string;
    private _debouncedTextUpdate: () => void;

    private constructor() {
        super();
        // Initialize pinned context to false
        void vscode.commands.executeCommand('setContext', CONSTANTS.integrationPinnedContextKey, false);

        this._debouncedTextUpdate = debounce(() => this._updateContext(), this._getConfigDebounceTimeout());
        this._context = this._createContext();
        if (this._context) {
            void vscode.commands.executeCommand('setContext', CONSTANTS.contextAvailableContextKey, true);
        }

        this._channel = vscode.window.createOutputChannel('Stitch');

        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this._statusBar.command = COMMANDS.selectScenario;
        this._updateStatusBar();

        const onDidChangeConfigurationListener = vscode.workspace.onDidChangeConfiguration(e => {
            this._onUpdateConfiguration(e);
        });

        const onDidChangeActiveTextEditorListener = vscode.window.onDidChangeActiveTextEditor((e): void => {
            if (e && ['file'].includes(e.document.uri.scheme)) {
                this._updateContextOnChangeActiveEditor();
            }
        });

        const onDidChangeTextEditorListener = vscode.workspace.onDidChangeTextDocument((e): void => {
             if (e.document.isUntitled) { return; }
             if (e.document.uri.scheme === 'output') { return; }
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

        
        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            void vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }
        this._endPoint = endpoint;

        this._register(this._channel);
        this._register(this._statusBar);
        this._register(onDidChangeConfigurationListener);
        this._register(onDidChangeActiveTextEditorListener);
        this._register(onDidChangeTextEditorListener);
        this._register(onDidChangeVisibleTextEditorsListener);
        this._register(vscode.workspace.onDidCreateFiles(() => this._updateContext()));
        this._register(vscode.workspace.onDidDeleteFiles(() => this._updateContext()));
        this._register(vscode.workspace.onDidRenameFiles(() => this._updateContext()));
    }

    public static create(): vscode.Disposable {
        return this._ensureContextHandler();
    }

    public dispose(): void {
        void vscode.commands.executeCommand('setContext', CONSTANTS.contextAvailableContextKey, false);
        void vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, false);
        super.dispose();
    }

    public static getContext(): Context | undefined {
        return this._current?._context;
    }

    public static getTreeProvider(): StitchTreeProvider {
        this._ensureContextHandler();
        return this._treeProvider;
    }

    public static showPreview(extensionUri: vscode.Uri): void {

        const context = this._ensureContextHandler();

        const currentPreview = context._preview;

        if (currentPreview) {
            currentPreview.reveal();
            return;
        }
        
        context._preview = context._register(StitchPreview.create(extensionUri));
        context._register(context._preview.onDidDispose(() => this._onPreviewDidDspose()));
        void vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, true);
        this.requestSimulationResult();
    }

    public static onPreviewVisible(preview: StitchPreview): void {
        const context = this._ensureContextHandler();

        if (!context._preview) {
            context._preview = preview;
        }

        void vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, true);
        this.requestSimulationResult();
    }

    public static hidePreview(): void {
        void vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, false);
    }

    public static togglePinned(): void {
        if (!this._current || !this._current._context) {
            return;
        }

        this._current._context.isPinned = !this._current._context.isPinned;
        const isPinned = this._current._context.isPinned;

        void vscode.commands.executeCommand('setContext', CONSTANTS.integrationPinnedContextKey, isPinned);
        ContextHandler.log(`Preview pinned: ${isPinned}`);
        this._current._simulateIntegration(this._current._context);
    }

    public static requestSimulationResult() {
        if (!this._current?._context) {
            this.log(`Unable to request simulation because Context is undefined`);
            return;
        }

        this._current._updateContext();
    }

    public static selectScenario(): void {
        if (!this._current?._context) {
            return;
        }

        const normalizeResult = ScenarioHelper.getScenarios(this._current._context.integrationFilePath);
        if (!normalizeResult.success) {
            void vscode.window.showErrorMessage('Some error occured for selecting a scenario!\nMake sure you have implemented the scenario.');
            return;
        }

        const scenarios = normalizeResult.scenarios;
        const quickPickItems = Object.keys(scenarios).sort();
        void vscode.window.showQuickPick(quickPickItems).then((name): void => {
            if (name && this._current?._context) {
                ContextHandler.log(`Scenario selected: ${name} for integration file: ${this._current._context.integrationFilename}`);
                this._current._context.activeScenario = scenarios[name];
                this._current._updateContext();
            }
        });
    }

    public static getRootFolderName() : string {
        const rootFolderName = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyRootFolderName);
        if (!rootFolderName) {
            return CONSTANTS.defaultRootFolderName;
        }
        return rootFolderName;
    }

    public static getMaxDirsUp(): number {
        const maxDirsUp = vscode.workspace.getConfiguration().get<number>(CONSTANTS.configKeyMaxDirsUpToFindRootFolder);
        if (!maxDirsUp) {
            return CONSTANTS.defaultDirsToFindRootFolder;
        }
        return maxDirsUp;
    }

    public static handlePreviewCommand(command: ICommand, extensionUri: vscode.Uri): void {
        if (!this._current?._preview) {
            return;
        }

        this._current._preview.handleCommand(command, extensionUri);
    }

    public static log(value: string): void {
        if (!this._current?._channel) {
            return;
        }

        this._current._channel.appendLine(`${new Date().toLocaleTimeString()} ${value}`);
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
        this._simulationResponse = undefined;
        this._updateStatusBar();
        PdfPreview.disposeAll();
        this._preview?.dispose();
        ContextHandler._treeProvider.clear();
    }

    private static _ensureContextHandler(): ContextHandler {

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
        if (e.affectsConfiguration(CONSTANTS.configKeyRootFolderName)) {
            this._onUpdateRootFolderName();
        }
        if (e.affectsConfiguration(CONSTANTS.configKeyMaxDirsUpToFindRootFolder)) {
            this._onUpdateMaxDirsUp();
        }
    }

    private _onUpdateEndpoint() {

        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            void vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

        this._endPoint = endpoint;
        void vscode.window.showInformationMessage(`The Stitch editor endpoint has been updated to: ${endpoint}`);

        this._updateContext();
    }

    private _onUpdateDebounceTimeout() {
        const timeout = this._getConfigDebounceTimeout();
        this._debouncedTextUpdate = debounce(() => this._updateContext(), timeout);
        void vscode.window.showInformationMessage(`The Stitch debounce timeout has been updated to: ${timeout} ms`);
    }

    private _onUpdateRootFolderName() {
        const rootFolderName = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyRootFolderName);

        void vscode.window.showInformationMessage(`The Stitch root folder name has been updated to: ${rootFolderName}`);
    }

    private _onUpdateMaxDirsUp() {
        const maxDirsUp = vscode.workspace.getConfiguration().get<number>(CONSTANTS.configKeyMaxDirsUpToFindRootFolder);

        void vscode.window.showInformationMessage(`The Stitch max dirs up to find the root folder has been updated to: ${maxDirsUp}`);
    }

    private static _onPreviewDidDspose() {
        void vscode.commands.executeCommand('setContext', CONSTANTS.previewActiveContextKey, false);
        if (this._current) {
            this._current._preview = undefined;
        }
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
        // Don't update if preview is pinned
        if (this._context?.isPinned) {
            return;
        }
        

        const previousContext = this._context;
        const newContext = this._createContext();
        if (previousContext?.integrationFilePath !== newContext?.integrationFilePath){
            this._updateContext();
        }
    }

    private _updateContext(): void {
        const previousContext = this._context;
        const newContext = this._createContext();

        this._context = newContext;

        if (!previousContext && !this._context) {
            ContextHandler.log(`Context remains undefined, no update performed`);
            this._clearContext();
            return;
        }

        if (!this._context) {
            this._context = previousContext;
        }

        this._updateStatusBar();
        if (this._context) {
            void vscode.commands.executeCommand('setContext', CONSTANTS.contextAvailableContextKey, true);

            if (this._context.integrationFilePath !== previousContext?.integrationFilePath) {
                PdfPreview.disposeAll();
            }

            this._simulateIntegration(this._context);
        }
    }

    private _simulateIntegration(context: Context) {

        let model: IntegrationRequestModel | undefined;
        try {
            const builder = new IngrationRequestBuilder(context);
            model = builder.build();
        } catch (error) {
            if (error instanceof Error) {
                if (this._preview) {
                    this._preview.handleError(error, 'Collecting files failed', context);
                }
                return; 
            }
        }

        ContextHandler.log(`Simulating integration for ${context.integrationFilename} (activeFile: ${context.activeFile.filepath})`);
        const simulateIntegrationUrl = `${this._endPoint}/editor/simulate/integration`;
        axios.post(simulateIntegrationUrl, model)
            .then(res => {
                this._simulationResponse = <ResponseData>res.data;
                this._handleResponse(this._simulationResponse, context);
            })
            .catch((err: unknown) => {
                if (err && err.hasOwnProperty('errors')) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const aggregateError = err as AggregateError;
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    const firstErr: Error = aggregateError.errors[0];
                    ContextHandler.log(`Simulation request failed: ${firstErr.message}`);
                    this._preview?.handleError(firstErr, 'Request failed', context);
                } else if (err instanceof Error) {
                    ContextHandler.log(`Simulation request failed with error: ${err.message}`);
                    this._preview?.handleError(err, 'Request failed', context);
                } else {
                    ContextHandler.log(`Simulation request failed with unknown error`);
                }
            });
    }

    private _handleResponse(responseData: ResponseData, context: Context) {
        const okResult = responseData.result;
        if (okResult) {
            const simulationResult = <EditorSimulateIntegrationResponse>responseData;
            
            this._preview?.showSimulationResult(simulationResult, context);
            try {
                const treeItems = TreeBuilder.generateTree(simulationResult.treeModel);
                ContextHandler._treeProvider.setTree(treeItems); 
            } catch (e) {
                if (e instanceof Error) {
                    void vscode.window.showErrorMessage(e.message);
                }
            }
        }
        else {
            this._preview?.showErrorResult(<ErrorData>responseData, context);
        }
    }
}

// Note: needed to be able to handle error
interface ResponseData {
    result?: unknown;
}
