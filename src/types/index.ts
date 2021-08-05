export interface ActiveFile {
	filepath: string;
	filecontent: string;
}

export type ReadWorkspaceFileFunc = (filepath: string) => string | undefined;

export interface PreviewContext {
	activeFile: ActiveFile;
	integrationFilePath: string;
	integrationFilename: string;
}

export interface ScenarioResult {
	success: boolean;
	scenarios: ScenarioSource[];
}

export interface ScenarioSource {
	name: string;
	path: string;
}

export interface IntegrationRequestModel {
	integrationFilePath: string;
	files: IntegrationFile[];
	scenarioFiles: IntegrationFile[];
}

export interface IntegrationFile {
	filename: string;
	filecontent: string;
}

export interface StitchError {
	title: string;
	description: string;
}

export interface StitchResponse {
	result: any;
	resultStatusCode: any;
	requests: Record<string, StepRequest>;
	integrationContext: IntegrationContext;
}

export interface IntegrationContext {
	model: object;
	steps: Record<string, StepResult>; //StepsDictionary
}

export type StepResult = BaseStepResult | HttpStepResult | RenderTemplateStepResult;

export interface BaseStepResult {
	$type: string;
	hasSuccessCondition: boolean;
	success?: boolean;
	hasStartCondition: boolean;
	started?: boolean;
}

export interface HttpStepResult extends BaseStepResult {
	request: {
		url: string;
		method: string;
	};

	response: {
		bodyFormat: string;
		statusCode: number;
		isSuccessStatusCode: boolean;
	}

	model: object;
}

export interface RenderTemplateStepResult extends BaseStepResult {
	response: {
		content: string;
		contentType: string;
		statusCode: number;
		isSuccessStatusCode: boolean;
		errorMessage: string;
	}
}

export interface StepRequest {
	method: string;
	requestUri: string;	
	content: string;
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
	viewStepRequest,
	viewStepResponse,
	viewIntegrationResponse,
}