import glob = require("glob");
import path = require("path");
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