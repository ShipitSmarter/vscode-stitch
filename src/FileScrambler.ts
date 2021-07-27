import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import { ScenarioSource, IntegrationRequestModel, IntegrationFile, ScenarioResult, ActiveFile, PreviewContext, ReadWorkspaceFileFunc } from './types';
import { CONSTANTS } from './constants';

export class FileScrambler {

    public static collectFiles(previewContext: PreviewContext, scenario: ScenarioSource, readWorkspaceFile: ReadWorkspaceFileFunc): IntegrationRequestModel {

        const integrationPath = previewContext.integrationFilePath;
        const integrationContent = this._readFile(previewContext, integrationPath, readWorkspaceFile);
        let integration;
        try {
            integration = JSON.parse(integrationContent);
        }
        catch (e) {
            throw new Error(`Integration file ${integrationPath} has invalid JSON`);
        }        

        let root = path.dirname(integrationPath);

        let importsPath = path.join(root, '../' + CONSTANTS.importsDirectoryName);

        let pathsToInclude = [
            ...glob.sync(`${root}/*.json`, undefined),  
            ...glob.sync(`${root}/*.sbn`, undefined)
        ];
        if (fs.existsSync(importsPath)) {
            root = path.dirname(root);
            pathsToInclude = [
                ...pathsToInclude,
                ...glob.sync(`${importsPath}/*.json`, undefined),
                ...glob.sync(`${importsPath}/*.sbn`, undefined)
            ];
        }

        const files: IntegrationFile[] = [];
        pathsToInclude.forEach(includePath => {
            files.push({
                filename: this._makeBlobStorageLikePath(includePath, root),
                filecontent: this._readFile(previewContext, includePath, readWorkspaceFile)
            });
        });

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
            integrationFilePath: this._makeBlobStorageLikePath(integrationPath, root),
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

    static _makeBlobStorageLikePath(path: string, root: string): string {
        const blobPath = path.replace(/\\/g, '/'), 
              blobRoot = root.replace(/\\/g, '/'); // convert backslash to forward slash
        return blobPath
            .replace(blobRoot, '') // trim the root path
            .substr(1); // no leading forward-slash is required
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


