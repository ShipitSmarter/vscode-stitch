export interface ActiveFile {
    filepath: string;
    filecontent: string;
}

export type ReadWorkspaceFileFunc = (filepath: string) => string | undefined;

export interface Context {
    activeFile: ActiveFile;
    integrationFilePath: string;
    integrationFilename: string;
    activeScenario: ScenarioSource;
}

export interface ScenarioResult {
    success: boolean;
    scenarios: Record<string, ScenarioSource>;
}

export interface ScenarioSource {
    name: string;
    path: string;
}

export interface TreeItem {
    name: string;
    path: string;
    isCollection?: boolean;
    children?: TreeItem[];
    exampleValue?: string;
}

export interface ICommand {
    action: CommandAction;
    content: string;
}

export enum CommandAction {
    viewStepRequest = 0,
    viewStepResponse = 1,
    viewIntegrationResponse = 2,
    storeScrollPosition = 3,
    createHttpRequest = 4,
}
