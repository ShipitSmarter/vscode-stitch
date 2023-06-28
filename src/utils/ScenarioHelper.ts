import glob = require("glob");
import path = require("path");
import fs = require("fs");
import { CONSTANTS } from "../constants";
import { FileScrambler } from "./FileScrambler";
import { Context, ScenarioResult, ScenarioSource } from "../types";
import { FileInput } from "../types/apiTypes";

export class ScenarioHelper {

    public static getScenarios(integrationFilePath: string): ScenarioResult {
        const result: Record<string, ScenarioSource> = {};
        let i,
            scenarioPath,
            isInvalid = false;

        const integrationDir = path.dirname(integrationFilePath);
        const dirs = glob.sync(`${integrationDir}/${CONSTANTS.scenariosDirectoryName}/*/`, undefined);
        if (!dirs || !dirs.length) { isInvalid = true; }
        for (i = 0; i < dirs.length; i++) {
            scenarioPath = dirs[i];
            const scenarioName = path.basename(scenarioPath);
            result[scenarioName] = {
                name: scenarioName,
                path: scenarioPath
            };
        }

        return { success: !isInvalid, scenarios: result };
    }

    public static getFileInput(context: Context, filePath: string): FileInput {
        const includePath = path.join(path.dirname(context.integrationFilePath), filePath);
        return <FileInput>{
            filename: path.basename(includePath), // scenario files don't require the path, only filename!
            filecontent: FileScrambler.readFile(context, includePath)
        };
    }

    public static getScenarioFiles(context: Context): FileInput[] {
        const scenarioFilesToInclude = [
            ...glob.sync(`${context.activeScenario.path}/input.*`, undefined),
            ...glob.sync(`${context.activeScenario.path}/step.*.*`, undefined)
        ];
        const scenarioFiles: FileInput[] = [];
        scenarioFilesToInclude.forEach(includePath => {
            scenarioFiles.push(<FileInput>{
                filename: path.basename(includePath), // scenario files don't require the path, only filename!
                filecontent: FileScrambler.readFile(context, includePath)
            });
        });

        return scenarioFiles;
    }

    public static getImportFiles(context: Context): FileInput[]{
        const integration = FileScrambler.readIntegrationFile(context);
        const integrationFolder = path.dirname(context.integrationFilePath) + path.sep;
        const imports = integration.integration.Imports;

        if (!imports || imports.length === 0)
        {
            return [];
        }

        const importFiles: FileInput[] = [];

        imports.forEach((importItem: string) => {
            if (importItem.startsWith("{{Env.ConfigsRootDir}}")) {
                // Here we load the location instructions file
                const configsPath = path.normalize(path.resolve(context.activeScenario.path, CONSTANTS.locationInstructionsFilename));
                if(fs.existsSync(configsPath)){
                    importFiles.push(<FileInput>{
                        filename: configsPath,
                        filecontent: FileScrambler.readFile(context, configsPath)
                    });
                }
            } else if (importItem.indexOf('{{') === -1) {
                const itemPath = path.normalize(path.resolve(integrationFolder, importItem));
                importFiles.push(<FileInput>{
                    filename: itemPath,
                    filecontent: FileScrambler.readFile(context, itemPath)
                });
            } else {
                // because the import contains scriban we load the file with a glob pattern
                const globImport = path.resolve(integrationFolder, importItem.replace(/{{.*?}}/g, '*'));
                glob.sync(globImport).forEach(x => {
                    const globPath = path.normalize(path.resolve(integrationFolder, x));
                    importFiles.push(<FileInput>{
                        filename: globPath,
                        filecontent: FileScrambler.readFile(context, globPath)
                    });
                });
            }
        });

        return importFiles;
    }

    public static getScenarioInputFilepath(scenario: ScenarioSource) : string {
        const files = glob.sync(`${scenario.path}/input.*`);
        return files && files[0];
    }

    public static getScenarioStepFilepath(scenario: ScenarioSource, stepName: string) : string {
        const files = glob.sync(`${scenario.path}/step.${stepName}.*`);
        return files && files[0];
    }

    public static isValidScenario(scenario: ScenarioSource): boolean {
        return glob.sync(`${scenario.path}/input.*`, undefined).length >= 1;
    }
    
}