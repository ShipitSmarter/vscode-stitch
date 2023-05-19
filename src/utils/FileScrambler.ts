import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import { ActiveFile, Context, ReadWorkspaceFileFunc } from '../types';
import { CONSTANTS } from '../constants';
import { ContextHandler } from '../ContextHandler';
import { ScenarioHelper } from './ScenarioHelper';

export class FileScrambler {
    
    public static getStepTypes(context: Context): Record<string, string> {
        const integrationFile = this.readIntegrationFile(context);
        const steps = integrationFile.integration.Steps;

        const result: Record<string, string> = {};
        if (steps) {
            for (const step of steps) {
                result[step.Id] = step.$type;
            }
        }

        return result;
    }
    
    public static readIntegrationFile(context: Context) : IntegrationFile {
        ContextHandler.log(`Loading integration file: ${context.integrationFilePath}`);
        const integrationPath = context.integrationFilePath;
        const integrationContent = FileScrambler.readFile(context, integrationPath);
        let integration: Integration;
        try {
            integration = <Integration>JSON.parse(integrationContent);
        }
        catch (e) {
            throw new Error(`Integration file ${integrationPath} has invalid JSON`);
        }

        return {
            content: integrationContent,
            integration: integration
        };
    }    

    public static determineContext(activeFile: ActiveFile, currentContext: Context | undefined): Context | undefined {

        const filepath = activeFile.filepath;

        // 1) Active file is the integration file
        if (filepath.endsWith(CONSTANTS.integrationExtension)) {
            return this._createContext(
                activeFile,
                filepath,
                path.basename(filepath),
                currentContext
            );
        }

        const parentFolder = path.dirname(filepath);
        let folderToCheck = parentFolder;
        // 2) Active file is a scenario file
        if (this._isScenarioFile(filepath)) {
            folderToCheck = path.join(parentFolder, '../../');
        }
        
        const integrations = glob.sync(`${folderToCheck}/*${CONSTANTS.integrationExtension}`, undefined);
        if (integrations && integrations.length > 0) {
            // filepath(vscode uri) => 'c:\\git\\Stitch\\vscode-stitch\\demo\\ups-booking\\scenarios\\0Simple\\step.ShipAccept.txt'
            // glob returns => 'c:/git/Stitch/vscode-stitch/demo/ups-booking/UPSShipping.integration.json'
            return this._createContext(
                activeFile,
                path.normalize(integrations[0]),
                path.basename(integrations[0]),
                currentContext
            );
        }

        if (currentContext) {
            // 3) we have an active preview, check if the active file is in the same path
            const previewFolder = path.dirname(currentContext.integrationFilePath);
            const activeFolder = path.normalize(parentFolder);

            // 4) activeFile is imports file
            const isActiveImport = path.basename(activeFolder) === CONSTANTS.importsDirectoryName 
                && path.dirname(previewFolder) === path.dirname(activeFolder);

            if (activeFolder.startsWith(previewFolder) || isActiveImport) {
                return this._createContext(
                    activeFile,
                    currentContext.integrationFilePath,
                    currentContext.integrationFilename,
                    currentContext
                );
            }
        }

        return;
    }

    private static _createContext(activeFile: ActiveFile, integrationFilePath: string, 
        integrationFilename: string, currentContext: Context | undefined
    ): Context | undefined {
        const normalizeResult = ScenarioHelper.getScenarios(integrationFilePath);
        if (!normalizeResult.success) {
            void vscode.window.showErrorMessage(`No scenarios found!\nTo provide a scenario create a "scenarios" directory next to the ${integrationFilename} file, subdirectories within the "scenarios" directory are regarded as scenarios.`);
            return;
        }

        let scenario = currentContext?.activeScenario;
        if (!scenario || currentContext?.integrationFilePath !== integrationFilePath){
            scenario = normalizeResult.scenarios[Object.keys(normalizeResult.scenarios)[0]];
            if (!ScenarioHelper.isValidScenario(scenario)) {
                void vscode.window.showErrorMessage(`Invalid scenario!\nScenario "${scenario.name}" requires at least the following files:\n\tinput.(txt|json|xml)`);
                return;
            }
        }

        return <Context>{
            activeFile, 
            integrationFilePath,
            integrationFilename,
            activeScenario: scenario,
        };
    }

    private static _isScenarioFile(filepath: string) : boolean {
        // files are stored like this
        // /scenarios/sample1/input.txt
        // - *.integration.json
        const parentParentDirectory = path.dirname(path.dirname(filepath));
        return fs.existsSync(parentParentDirectory) 
                && path.basename(parentParentDirectory) === CONSTANTS.scenariosDirectoryName;
    }

    public static readFile(context: Context, filepath: string, readWorkspaceFile: ReadWorkspaceFileFunc = _readWorkspaceFile) : string {
        const normalizedPath = path.normalize(filepath);
        if (normalizedPath === context.activeFile.filepath) {
            return context.activeFile.filecontent;
        }

        const workspaceFileContent = readWorkspaceFile(normalizedPath);
        if (workspaceFileContent) {
            return workspaceFileContent;
        }

        return fs.readFileSync(normalizedPath, 'utf8');
    }
}

function _readWorkspaceFile(filepath: string): string | undefined {
    const textDoc = vscode.workspace.textDocuments.find(doc => doc.fileName === filepath);
    if (textDoc) {
        return textDoc.getText();
    }

    return;
}

export interface IntegrationFile {
    content: string;
    integration: Integration;
}

/* eslint-disable @typescript-eslint/naming-convention */
export interface Integration {
    Request?: IntegrationRequest;
    Translations?: string[];
    Steps?: IntegrationStep[];
    Imports?: string[];
}

export interface IntegrationRequest {
    PreParser?: {
        TypeName?: string;
        ConfigurationFilePath?: string;
    }
}

export interface IntegrationStep {
    $type: string;
    Id: string;
    [keys: string]: unknown[] | string | number;
}
/* eslint-enable @typescript-eslint/naming-convention */