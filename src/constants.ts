export const CONSTANTS = {
	integrationExtension: '.integration.json',
	scenariosDirectoryName: 'scenarios',
	importsDirectoryName: 'imports',

	panelTitlePrefix: 'Preview: ',
	statusbarTitlePrefix: 'Scenario: ',
	
	configKeyEndpointUrl: 'stitch.endpointUrl',
	configKeyDebounceTimeout: 'stitch.debounceTimeout',

	previewActiveContextKey: 'stitch:previewActive',

	httpStepResultTypeType: 'Core.Entities.StepResults.HttpStepResult, Core',
	renderTemplateStepResultType: 'Core.Entities.StepResults.RenderTemplateStepResult, Core',
	mailStepResultType: 'Core.Entities.StepResults.MailStepResult, Core',
	sftpStepResultType: 'Core.Entities.StepResults.SftpStepResult, Core',
	skippedStepResultType: 'Core.Entities.StepResults.SkippedStep, Core',

	defaultDebounceTimeout: 500
};

export const MESSAGES = {
	endpointUrlNotConfigured: `The '${CONSTANTS.configKeyEndpointUrl}' is not configured, please set this up in File -> Preferences -> Settings`,
	debounceTimeoutNotConfigured: `The '${CONSTANTS.configKeyDebounceTimeout}' is not configured, please set this up in File -> Preferences -> Settings`
};

export const COMMANDS = {
	insertModelProperty: 'stitch.insertModelProperty',
	responseUpdated: 'stitch.responseUpdated',

	startPreview: 'stitch.preview',
	selectScenario: 'stitch.selectScenario',
	showScenarioSource: 'stitch.showScenarioSource',

	createHash: 'stitch.createHash',
	createSecret: 'stitch.createSecret'
};