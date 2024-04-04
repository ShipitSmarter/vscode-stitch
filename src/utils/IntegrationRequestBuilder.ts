import * as path from 'path';
import * as vscode from 'vscode';
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

    public constructor(context: Context) {
        this._context = context;
        this._integrationFolder = path.dirname(context.integrationFilePath) + path.sep;
        this._filesToSend = {};
    }

    public build() : IntegrationRequestModel {

        const integration = FileScrambler.readIntegrationFile(this._context);
        this._filesToSend[this._context.integrationFilePath] = integration.content;
        const schemaPath = FileScrambler.findSchemaFile(this._context.integrationFilePath);
        if(schemaPath){
            this._addToFilesToSend(schemaPath);
        }

        this._loadPreParserConfig(integration.integration.Request);
        this._loadTranslations(integration.integration.Translations);
        this._loadImports();
        this._loadRenderTemplateAdditionalFiles(integration.integration.Steps);
        this._loadIncludes(integration.content);
        
        const files = this._createFileInputsFromFilesToSend();
        const scenarioFiles = ScenarioHelper.getScenarioFiles(this._context);

        return {
            integrationFilePath: FileScrambler.makeBlobStorageLikePath(this._context, this._context.integrationFilePath),
            files,
            scenarioFiles,
            scenarioName: this._context.activeScenario.name,
            prettyPrint: vscode.workspace.getConfiguration().get<boolean>(CONSTANTS.configKeyPrettyPrint) ?? false
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

        const translationsRoot = findDirectoryWithinParent(this._context.rootPath, 'translations', 1);
        if (translationsRoot === undefined) {
            throw new Error(`Unable to locate 'translations' folder under ${this._context.rootPath}!`);
        }
        translations.forEach((translation: string) => {
            this._addToFilesToSend(path.join(translationsRoot, `${translation}.csv`));
        });
    }

    private _loadImports() {
        const importFiles = ScenarioHelper.getImportFiles(this._context);
        if (!importFiles || importFiles.length === 0)
        {
            return;
        }
        importFiles.forEach((importItem: FileInput) => {
            if (!this._filesToSend[importItem.filename]) {
                ContextHandler.log(`\tLoading file: ${importItem.filename}`);
                this._filesToSend[importItem.filename] = importItem.filecontent;
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

    private _resolvePath(file: string) : string {
        if (file[0] === '/') {
            return path.normalize(path.resolve(this._context.rootPath, file.substring(1)));
        }
        return path.normalize(path.resolve(this._integrationFolder, file));
         
    }

    private _createFileInputsFromFilesToSend(): FileInput[] {
        return Object.keys(this._filesToSend).map(filepath => <FileInput>{
            filename: FileScrambler.makeBlobStorageLikePath(this._context, filepath),
            filecontent: this._filesToSend[filepath]
        });
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
