export const CONSTANTS = {
	integrationExtension: '.integration.json',
	scenariosDirectoryName: 'scenarios',
    scenarioInputFileName: 'input.txt',
	importsDirectoryName: 'imports',

	panelTitlePrefix: 'Preview: ',
	statusbarTitlePrefix: 'Scenario: ',
	
	configKeyEndpointUrl: 'stitch.endpointUrl',
	previewActiveContextKey: 'stitch:previewActive'
};

export const MESSAGES = {
	endpointUrlNotConfigured: `The '${CONSTANTS.configKeyEndpointUrl}' is not configured, please set this up in File -> Preferences -> Settings`
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