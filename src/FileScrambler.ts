import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import { ScenarioSource, IntegrationRequestModel, IntegrationFile, ScenarioResult, ActiveFile, Context, ReadWorkspaceFileFunc, StepConfiguration } from './types';
import { CONSTANTS } from './constants';

export class FileScrambler {
    
    public static collectFiles(context: Context): IntegrationRequestModel {

        const files: IntegrationFile[] = [];

        let integrationPath = context.integrationFilePath;
        const integrationContent = this._readFile(context, integrationPath);
        let integration;
        try {
            integration = JSON.parse(integrationContent);
        }
        catch (e) {
            throw new Error(`Integration file ${integrationPath} has invalid JSON`);
        }

        let root = path.dirname(integrationPath) + path.sep;

        // load translation files if required
        if (integration.Translations && integration.Translations.length > 0) {
            let translationsRoot = this._findWithinParent(root, 'translations', 5);
            if (translationsRoot === undefined) {
                throw new Error(`Unable to locate 'translations' folder!`);
            }
            integration.Translations.forEach((translation: String) => {
                const translationFilePath = path.join(translationsRoot!, `${translation}.csv`);
                files.push({
                    filename: `translations/${translation}.csv`,
                    filecontent: this._readFile(context, translationFilePath)
                });
            });
        }

        let importsPath = path.join(root, '../' + CONSTANTS.importsDirectoryName);

        let pathsToInclude = [
            ...glob.sync(`${root}/*.json`, undefined),
            ...glob.sync(`${root}/*.sbn`, undefined),
            ...glob.sync(`${root}/*.sbn-html`, undefined),
        ];
        if (fs.existsSync(importsPath)) {
            root = path.dirname(root) + path.sep;
            pathsToInclude = [
                ...pathsToInclude,
                ...glob.sync(`${importsPath}/*.json`, undefined),
                ...glob.sync(`${importsPath}/*.sbn`, undefined),
                ...glob.sync(`${importsPath}/*.sbn-html`, undefined),
            ];
        }

        // Load renderTemplate step additionalFiles
        let additionalFiles: string[] = [];
        let requiredNestingLevel = 0;
        const renderTemplateSteps = integration.Steps?.filter((s: any) => 'AdditionalFiles' in s) || [];
        for (const step of renderTemplateSteps) {
            for (const file of step.AdditionalFiles) {
                if (file.startsWith('../')) {
                    var nestingLevel = (file.match(/\.\.\//g) || []).length; // Count occurences of '../'
                    if (nestingLevel > requiredNestingLevel) { requiredNestingLevel = nestingLevel; }
                }

                additionalFiles.push(file);
            }
        }

        /* Mimic required nested directory structure (e.g. dir1/dir2/).
         * Required so relative pathing to parent folders, like '../../base/style.css' , works.
         */
        let nestingStructure = '';
        if (fs.existsSync(importsPath)) { --requiredNestingLevel; } // If imports path exists, root is moved up one folder, so we require one less extra nesting directory.
        while (requiredNestingLevel > 0) {
            nestingStructure = `dir${requiredNestingLevel--}${path.sep}${nestingStructure}`;
        }

        pathsToInclude.forEach(includePath => {
            files.push({
                filename: this._makeBlobStorageLikePath(includePath, root, nestingStructure),
                filecontent: this._readFile(context, includePath)
            });
        });

        for (const filePath of [...new Set(additionalFiles)]) {
            files.push({
                filename: this._makeBlobStorageLikePath(filePath, root, nestingStructure),
                filecontent: this._readFile(context, path.join(path.dirname(integrationPath), filePath))
            });
        }

        const scenarioFiles = this.getScenarioFiles(context);

        return {
            integrationFilePath: this._makeBlobStorageLikePath(integrationPath, root, nestingStructure),
            files,
            scenarioFiles
        };
    }

    static getScenarioFiles(context: Context): IntegrationFile[] {
        let scenarioFilesToInclude = [
            ...glob.sync(`${context.activeScenario.path}/input.*`, undefined),
            ...glob.sync(`${context.activeScenario.path}/step.*.*`, undefined)
        ];
        const scenarioFiles: IntegrationFile[] = [];
        scenarioFilesToInclude.forEach(includePath => {
            scenarioFiles.push({
                filename: path.basename(includePath), // scenario files don't require the path, only filename!
                filecontent: this._readFile(context, includePath)
            });
        });

        return scenarioFiles;
    }

    public static getScenarioInputFilepath(scenario: ScenarioSource) : string {
        const files = glob.sync(`${scenario.path}/input.*`);
        return files && files[0];
    }

    static getScenarioStepFilepath(scenario: ScenarioSource, stepName: string) : string {
        const files = glob.sync(`${scenario.path}/step.${stepName}.*`);
        return files && files[0];
    }


    static getStepTypes(context: Context): Record<string, string> {
        const integrationPath = context.integrationFilePath;
        const integrationContent = this._readFile(context, integrationPath);
        const integration = JSON.parse(integrationContent);
        const steps = <any[]>integration.Steps;

        let result: Record<string, string> = {};
        if (steps) {
            for (let step of steps) {
                result[step.Id] = step.$type;
            }
        }

        return result;
    }

    private static _findWithinParent(root: string, folderNameToLookFor: string, maxUp: number) : string | undefined  {
        const pathCheck = path.join(root, folderNameToLookFor);
        if (maxUp === 0) { return undefined; }
        if (fs.existsSync(pathCheck)) { return pathCheck; }
        else {
            return this._findWithinParent(path.dirname(root), folderNameToLookFor, --maxUp);
        }
    }

    public static isValidScenario(scenario: ScenarioSource): boolean {
        return glob.sync(`${scenario.path}/input.*`, undefined).length >= 1;
    }

    public static getScenarios(integrationFilePath: string): ScenarioResult {
        let result: ScenarioSource[] = [];
        let i,
            scenarioPath,
            invalid = false;

        const integrationDir = path.dirname(integrationFilePath);
        let dirs = glob.sync(`${integrationDir}/${CONSTANTS.scenariosDirectoryName}/*/`, undefined);
        if (!dirs || !dirs.length) { invalid = true; }
        for (i = 0; i < dirs.length; i++) {
            scenarioPath = dirs[i];
            result.push({
                name: path.basename(scenarioPath),
                path: scenarioPath
            });
        }

        return { success: !invalid, scenarios: result };
    }

    public static determineContext(activeFile: ActiveFile, currentContext: Context | undefined): Context | undefined {

        const filepath = activeFile.filepath;

        // 1) Active file is the integration file
        if (filepath.endsWith(CONSTANTS.integrationExtension)) {
            return this._createContext(
                activeFile,
                filepath,
                path.basename(filepath)
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
                path.basename(integrations[0])
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
                    currentContext.integrationFilename
                );
            }
        }
    }

    private static _createContext(activeFile: ActiveFile, integrationFilePath: string, integrationFilename: string): Context | undefined {
        const normalizeResult = this.getScenarios(integrationFilePath);
        if (!normalizeResult.success) {
            vscode.window.showErrorMessage(`No scenarios found!\nTo provide a scenario create a "scenarios" directory next to the ${integrationFilename} file, subdirectories within the "scenarios" directory are regarded as scenarios.`);
            return;
        }

        const scenario = normalizeResult.scenarios[0];
        if (!this.isValidScenario(scenario)) {
            vscode.window.showErrorMessage(`Invalid scenario!\nScenario "${scenario.name}" requires at least the following files:\n\tinput.(txt|json|xml)`);
            return;
        }

        return <Context>{
            activeFile, 
            integrationFilePath,
            integrationFilename,
            activeScenario: normalizeResult.scenarios[0],
        };
    }

    static _isScenarioFile(filepath: string) : boolean {
        // files are stored like this
        // /scenarios/sample1/input.txt
        // - *.integration.json
        const parentParentDirectory = path.dirname(path.dirname(filepath));
        return fs.existsSync(parentParentDirectory) 
                && path.basename(parentParentDirectory) === CONSTANTS.scenariosDirectoryName;
    }

    static _makeBlobStorageLikePath(absolutePath: string, root: string, nestingStructure: string): string {
        let blobPath = path.normalize(absolutePath)
            .replace(path.normalize(root), ''); // trim the root path

        // Make sure all slashes are correct to concat the paths
        if (blobPath.startsWith('/')) { blobPath = blobPath.substr(1); }
        if (nestingStructure.startsWith('/')) { nestingStructure = nestingStructure.substr(1); }
        if (nestingStructure !== '' && !nestingStructure.endsWith('/')) { nestingStructure += '/'; }

        const normalizedPath = path.normalize(`${nestingStructure}${blobPath}`);
        return normalizedPath
            .replace(/\\/g, '/') // Replace backslash with forward slash
            .replace(/\/\//g, '/') // Replace double slashes with one
            .replace(/\.\.\//g, ''); // Remove '../' from start
    }

    static _readFile(context: Context, filepath: string, readWorkspaceFile: ReadWorkspaceFileFunc = this._readWorkspaceFile) : string {
        const normalizedPath = path.normalize(filepath);
        if (normalizedPath === context.activeFile.filepath) {
            return context.activeFile.filecontent;
        }

        const workspaceFileContent = readWorkspaceFile(normalizedPath);
        if (workspaceFileContent) {
            return workspaceFileContent;
        }

        const readOptions = { encoding: 'utf8', flag: 'r' };
        return fs.readFileSync(normalizedPath, readOptions);
    }

    private static _readWorkspaceFile(filepath: string): string | undefined {
        const textDoc = vscode.workspace.textDocuments.find(doc => doc.fileName === filepath);
        if (textDoc) {
            return textDoc.getText();
        }
    }
}

