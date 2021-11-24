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
	stepConfigurations: Record<string, StepConfiguration>;
	integrationContext: IntegrationContext;
}

export interface BaseStepConfiguration {
	id: string;
	template: string;
	successCondition: string;
	startCondition: string;
}

export interface HttpStepConfiguration extends BaseStepConfiguration {
	method: string;
	headers: Record<string, string>;
	url: string;
}

export interface MailStepConfiguration extends BaseStepConfiguration {
	from: string;
	to: string[];
	subject: string;
}

export interface RenderTemplateStepConfiguration extends BaseStepConfiguration {
	additionalFiles: string[];
}

export interface SftpStepConfiguration extends BaseStepConfiguration {
	host: string;
	port: number;
	username: string;
	password: string;
	path: string;
	filename: string;
}

export type StepConfiguration = BaseStepConfiguration | HttpStepConfiguration | MailStepConfiguration | RenderTemplateStepConfiguration | SftpStepConfiguration;

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
}