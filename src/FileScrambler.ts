import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import { ScenarioSource, IntegrationRequestModel, IntegrationFile, ScenarioResult, ActiveFile, PreviewContext, ReadWorkspaceFileFunc } from './types';
import { CONSTANTS } from './constants';

export class FileScrambler {

    public static collectFiles(previewContext: PreviewContext, scenario: ScenarioSource, readWorkspaceFile: ReadWorkspaceFileFunc): IntegrationRequestModel {

        const integrationPath = previewContext.integrationFilePath;
        let root = path.dirname(integrationPath);

        let importsPath = path.join(root, '../imports');

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

        let scenarioInput = {
            filename: CONSTANTS.scenarioInputFileName,
            filecontent: this._readFile(previewContext, path.join(scenario.path, CONSTANTS.scenarioInputFileName), readWorkspaceFile)
        };
        let stepResults = glob.sync(`${scenario.path}/step.*.txt`, undefined)
            .map(stepPath => {
                return {
                    filename: path.basename(stepPath),
                    filecontent: this._readFile(previewContext, stepPath, readWorkspaceFile)
                };
            });

        return {
            integrationFilePath: this._makeBlobStorageLikePath(integrationPath, root),
            files,
            scenario: { input: scenarioInput, stepResults }
        };
    }

    public static isValidScenario(scenario: ScenarioSource): boolean {
        const inputFile = path.join(scenario.path, CONSTANTS.scenarioInputFileName);
        if (!fs.existsSync(inputFile)) {
            return false;
        }
        return glob.sync(`${scenario.path}/step.*.txt`, undefined).length >= 1;
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

    public static determinePreviewContext(activeFile: ActiveFile): PreviewContext | undefined {

        // imports dir (name == imports) --> one up and scan
        //  --> can't determine because next to import multiple directories might exist
        // scenario's dir (has input.txt) --> one up an scan
        // scan current dir --> *.integration.json

        const filepath = activeFile.filepath;

        if (filepath.endsWith(CONSTANTS.integrationExtension)) {
            return <PreviewContext>{ 
                activeFile: activeFile, 
                integrationFilePath: filepath,
                integrationFilename: path.basename(filepath)
            };
        }

        const parentFolder = path.dirname(filepath);
        let folderToCheck = parentFolder;
        if (this._isScenarioFile(filepath)) {
            folderToCheck = path.join(parentFolder, '../../');
        }

        // filepath(vscode uri) => 'c:\\git\\Stitch\\vscode-stitch\\demo\\ups-booking\\scenarios\\0Simple\\step.ShipAccept.txt'
        // glob returns => 'c:/git/Stitch/vscode-stitch/demo/ups-booking/UPSShipping.integration.json'
        const integrations = glob.sync(`${folderToCheck}/*${CONSTANTS.integrationExtension}`, undefined);
        if (integrations && integrations.length > 0) {
            return <PreviewContext>{ 
                activeFile: activeFile, 
                integrationFilePath: path.normalize(integrations[0]),
                integrationFilename: path.basename(integrations[0])
            };
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


