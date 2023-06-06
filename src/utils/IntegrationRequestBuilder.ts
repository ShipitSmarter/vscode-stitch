import * as path from 'path';
import * as glob from 'glob';
import { FileScrambler, IntegrationRequest, IntegrationStep } from "./FileScrambler";
import { Context } from "../types";
import { ContextHandler } from '../ContextHandler';
import { findDirectoryWithinParent } from './helpers';
import { ScenarioHelper } from './ScenarioHelper';
import { FileInput, IntegrationRequestModel } from '../types/apiTypes';
import { CONSTANTS } from '../constants';

export class IngrationRequestBuilder {

    // Dictionary of files for an integration, key=absolute file path, value=file content
    private _filesToSend: Record<string, string>;
    private _context: Context;
    private _integrationFolder: string;
    private _rootPath: string;

    public constructor(context: Context, rootFolderName: string) {
        this._context = context;
        this._integrationFolder = path.dirname(context.integrationFilePath) + path.sep;
        this._rootPath = this._locateRootFolder(this._integrationFolder, rootFolderName);
        this._filesToSend = {};
    }

    public build() : IntegrationRequestModel {

        const integration = FileScrambler.readIntegrationFile(this._context);
        this._filesToSend[this._context.integrationFilePath] = integration.content;
        if(this._context.schemaFilePath !== undefined){
            const schema = FileScrambler.readFile(this._context, this._context.schemaFilePath);
            this._filesToSend[this._context.schemaFilePath] = schema;
        }

        this._loadPreParserConfig(integration.integration.Request);
        this._loadTranslations(integration.integration.Translations);
        this._loadImports(integration.integration.Imports);
        this._loadRenderTemplateAdditionalFiles(integration.integration.Steps);
        this._loadIncludes(integration.content);
        
        const files = this._createFileInputsFromFilesToSend();
        const scenarioFiles = ScenarioHelper.getScenarioFiles(this._context);

        return {
            integrationFilePath: this._makeBlobStorageLikePath(this._context.integrationFilePath),
            files,
            scenarioFiles
        };
    }
    private _loadPreParserConfig(integrationRequest: IntegrationRequest | undefined) {
        const preParserConfig = integrationRequest?.PreParser?.ConfigurationFilePath;
        if (!preParserConfig) {
            return;
        }

        const preParserConfigFile = path.join(this._integrationFolder, preParserConfig);
        this._addToFilesToSend(preParserConfigFile);
    }

    private _loadTranslations(translations: string[] | undefined) {
        if (!translations || translations.length === 0)
        {
            return;
        }

        const translationsRoot = findDirectoryWithinParent(this._rootPath, 'translations', 1);
        if (translationsRoot === undefined) {
            throw new Error(`Unable to locate 'translations' folder under ${this._rootPath}!`);
        }
        translations.forEach((translation: string) => {
            this._addToFilesToSend(path.join(translationsRoot, `${translation}.csv`));
        });
    }

    private _loadImports(imports: string[] | undefined) {
        if (!imports || imports.length === 0)
        {
            return;
        }

        imports.forEach((importItem: string) => {
            if (importItem === "[configs]/@locationInstructions") {
                // Here we load the location instructions file
                const instructionFile = FileScrambler.readFile(this._context, path.resolve(this._context.activeScenario.path, CONSTANTS.locationInstructionsFilename));
                this._filesToSend[path.resolve(this._integrationFolder, CONSTANTS.locationInstructionsFilename)] = instructionFile;
            } else if (importItem.indexOf('{{') === -1) {
                this._addToFilesToSend(path.resolve(this._integrationFolder, importItem));
            } else {
                // because the import contains scriban we load the file with a glob pattern
                const globImport = path.resolve(this._integrationFolder, importItem.replace(/{{.*?}}/g, '*'));
                glob.sync(globImport).forEach(x => this._addToFilesToSend(x));
            }
        });
    }


    private _loadRenderTemplateAdditionalFiles(steps: IntegrationStep[] | undefined) {
        if (!steps || steps.length === 0)
        {
            return;
        }

        const renderTemplateSteps = steps?.filter((s) => 'AdditionalFiles' in s) || [];
        for (const step of renderTemplateSteps) {
            for (const file of <string[]>step.AdditionalFiles) {
                const additionFile = this._resolvePath(file);
                this._addToFilesToSend(additionFile);
            }
        }
    }    
    
    private _loadIncludes(content: string) {
        const scribanIncludes = this._getScribanIncludes(content);
        if (!scribanIncludes) {
            return;
        }

        scribanIncludes.forEach(scribanInclude => {
            const includeFilePath = this._resolvePath(scribanInclude);
            if (this._addToFilesToSend(includeFilePath)) {
                this._loadIncludes(this._filesToSend[includeFilePath]);
            }
        });
    }

    private _locateRootFolder(integrationFolder: string, rootFolderName: string) : string {
        const rootPath = findDirectoryWithinParent(integrationFolder, rootFolderName, CONSTANTS.maxUpForRootFolder);
        if (!rootPath) {
            throw new Error(`Unable to locate root folder named '${rootFolderName}' (max up: ${CONSTANTS.maxUpForRootFolder})`);
        }
        return rootPath;
    }

    private _resolvePath(file: string) : string {
        if (file[0] === '/') {
            return path.normalize(path.resolve(this._rootPath, file.substring(1)));
        }
        return path.normalize(path.resolve(this._integrationFolder, file));
         
    }

    private _createFileInputsFromFilesToSend(): FileInput[] {
        return Object.keys(this._filesToSend).map(filepath => <FileInput>{
            filename: this._makeBlobStorageLikePath(filepath),
            filecontent: this._filesToSend[filepath]
        });
    }
    
    private _makeBlobStorageLikePath(filepath: string): string {
        // blob should not contain the starting path separator
        const charsToSkip = this._rootPath.endsWith(path.sep) ? this._rootPath.length : this._rootPath.length + 1; 
        return filepath
            .substring(charsToSkip)
            .replace(/\\/g, '/');
    }

    private _getScribanIncludes(content: string) : string[] | undefined {
        const includeRegex = /include '(.*?)'/gm;
        const includes = [];
        let match;
        while ((match = includeRegex.exec(content)) !== null) {
            const include = match[1];
            includes.push(include);
        }
        return includes.length === 0 ? undefined : [...new Set<string>(includes)];
    }

    private _addToFilesToSend(filePath: string): boolean {
        const normalizedPath = path.normalize(filePath);

        if (this._filesToSend[normalizedPath]) {
            return false;
        }
        ContextHandler.log(`\tLoading file: ${normalizedPath}`);
        this._filesToSend[normalizedPath] = FileScrambler.readFile(this._context, normalizedPath);
        return true;
    }
}
