import * as path from 'path';
import * as glob from 'glob';
import { FileScrambler } from "./FileScrambler";
import { Context } from "../types";
import { ContextHandler } from '../ContextHandler';
import { findCommandParentDirectory, findDirectoryWithinParent } from './helpers';
import { ScenarioHelper } from './ScenarioHelper';
import { FileInput, IntegrationRequestModel } from '../types/apiTypes';

export class IngrationRequestBuilder {

    // Dictionary of files for an integration, key=absolute file path, value=file content
    private _filesToSend: Record<string, string>;
    private _context: Context;
    private _root: string;
    private _commonPath: string;

    public constructor(context: Context) {
        this._context = context;
        this._root = path.dirname(context.integrationFilePath) + path.sep;
        this._commonPath = this._root;
        this._filesToSend = {};
    }

    public build() : IntegrationRequestModel {

        // 1. parse integration json
        const integration = FileScrambler.readIntegrationFile(this._context);
        this._filesToSend[this._context.integrationFilePath] = integration.content;

        // 2. load translations based on json (exist on root of blob, convention)
        this._loadTranslations(integration.integration.Translations);

        // 3. load imports based on json
        this._loadImports(integration.integration.Imports);
        
        // 4. load includes (scriban)
        this._loadIncludes(integration.content);
        
        //      should we support loading them from / (this would be `files` directory in StitchConfigs)
        // 5. for all files determine the most common ancester, and base the File.filename relative to that path!
        const files = this._createFileInputsFromFilesToSend();
        
        // 5. load scenario files 
        const scenarioFiles = ScenarioHelper.getScenarioFiles(this._context);

        return {
            integrationFilePath: this._makeBlobStorageLikePath(this._context.integrationFilePath),
            files,
            scenarioFiles
        };
    }

    private _loadTranslations(translations: string[] | undefined) {
        if (!translations || translations.length === 0)
        {
            return;
        }

        const translationsRoot = findDirectoryWithinParent(this._root, 'translations', 5);
        if (translationsRoot === undefined) {
            throw new Error(`Unable to locate 'translations' folder!`);
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
            if (importItem.indexOf('{{') === -1) {
                this._addToFilesToSend(path.resolve(this._root, importItem));
            } else {
                // because the import contains scriban we load the file with a glob pattern
                const globImport = path.resolve(this._root, importItem.replace(/{{.*?}}/g, '*'));
                glob.sync(globImport).forEach(x => this._addToFilesToSend(x));
            }
        });
    }
    
    private _loadIncludes(content: string) {
        const scribanIncludes = this._getScribanIncludes(content);
        if (!scribanIncludes) {
            return;
        }

        scribanIncludes.forEach(scribanInclude => {
            const includeFilePath = path.resolve(this._root, scribanInclude);
            if (this._addToFilesToSend(includeFilePath)) {
                this._loadIncludes(this._filesToSend[includeFilePath]);
            }
        });
    }

    private _createFileInputsFromFilesToSend(): FileInput[] {
        return Object.keys(this._filesToSend).map(filepath => <FileInput>{
            filename: this._makeBlobStorageLikePath(filepath),
            filecontent: this._filesToSend[filepath]
        });
    }
    
    private _makeBlobStorageLikePath(filepath: string): string {
        const charsToSkip = this._commonPath.length;
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
        this._commonPath = findCommandParentDirectory(this._commonPath, normalizedPath) as string;
        ContextHandler.log(`\tLoading file: ${normalizedPath}`);
        this._filesToSend[normalizedPath] = FileScrambler.readFile(this._context, normalizedPath);
        return true;
    }
}
