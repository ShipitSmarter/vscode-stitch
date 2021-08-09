import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import { ScenarioSource, IntegrationRequestModel, IntegrationFile, ScenarioResult, ActiveFile, PreviewContext, ReadWorkspaceFileFunc } from './types';
import { CONSTANTS } from './constants';

export class FileScrambler {

    public static collectFiles(previewContext: PreviewContext, scenario: ScenarioSource, readWorkspaceFile: ReadWorkspaceFileFunc): IntegrationRequestModel {

        const files: IntegrationFile[] = [];

        let integrationPath = previewContext.integrationFilePath;
        const integrationContent = this._readFile(previewContext, integrationPath, readWorkspaceFile);
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
                    filecontent: this._readFile(previewContext, translationFilePath, readWorkspaceFile)
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
                filecontent: this._readFile(previewContext, includePath, readWorkspaceFile)
            });
        });

        for (const filePath of [...new Set(additionalFiles)]) {
            files.push({
                filename: this._makeBlobStorageLikePath(filePath, root, nestingStructure),
                filecontent: this._readFile(previewContext, path.join(path.dirname(integrationPath), filePath), readWorkspaceFile)
            });
        }

        let scenarioFilesToInclude = [
            ...glob.sync(`${scenario.path}/input.*`, undefined),  
            ...glob.sync(`${scenario.path}/step.*.*`, undefined)
        ];
        const scenarioFiles: IntegrationFile[] = [];
        scenarioFilesToInclude.forEach(includePath => {
            scenarioFiles.push({
                filename: path.basename(includePath), // scenario files don't require the path, only filename!
                filecontent: this._readFile(previewContext, includePath, readWorkspaceFile)
            });
        });

        return {
            integrationFilePath: this._makeBlobStorageLikePath(integrationPath, root, nestingStructure),
            files,
            scenarioFiles
        };
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
        return glob.sync(`${scenario.path}/input.*`, undefined).length >= 1
            && glob.sync(`${scenario.path}/step.*.*`, undefined).length >= 1;
    }

    public static getScenarios(previewContext: PreviewContext): ScenarioResult {
        let result: ScenarioSource[] = [];
        let i,
            scenarioPath,
            invalid = false;

        const integrationDir = path.dirname(previewContext.integrationFilePath);
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

    public static determinePreviewContext(activeFile: ActiveFile, currentPreview: PreviewContext | undefined): PreviewContext | undefined {

        const filepath = activeFile.filepath;

        // 1) Active file is the integration file
        if (filepath.endsWith(CONSTANTS.integrationExtension)) {
            return <PreviewContext>{ 
                activeFile: activeFile, 
                integrationFilePath: filepath,
                integrationFilename: path.basename(filepath)
            };
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
            return <PreviewContext>{ 
                activeFile: activeFile, 
                integrationFilePath: path.normalize(integrations[0]),
                integrationFilename: path.basename(integrations[0])
            };
        }

        if (currentPreview) {
            // 3) we have an active preview, check if the active file is in the same path
            const previewFolder = path.dirname(currentPreview.integrationFilePath);
            const activeFolder = path.normalize(parentFolder);

            // 4) activeFile is imports file
            const isActiveImport = path.basename(activeFolder) === CONSTANTS.importsDirectoryName 
                && path.dirname(previewFolder) === path.dirname(activeFolder);

            if (activeFolder.startsWith(previewFolder) || isActiveImport) {
                return <PreviewContext>{ 
                    activeFile: activeFile, 
                    integrationFilePath: currentPreview.integrationFilePath,
                    integrationFilename: currentPreview.integrationFilename
                };
            }
        }
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

    static _readFile(previewContext: PreviewContext, filepath: string, readWorkspaceFile: ReadWorkspaceFileFunc) : string {
        const normalizedPath = path.normalize(filepath);
        if (normalizedPath === previewContext.activeFile.filepath) {
            return previewContext.activeFile.filecontent;
        }

        const workspaceFileContent = readWorkspaceFile(normalizedPath);
        if (workspaceFileContent) {
            return workspaceFileContent;
        }

        const readOptions = { encoding: 'utf8', flag: 'r' };        
        return fs.readFileSync(normalizedPath, readOptions);
    }
}


