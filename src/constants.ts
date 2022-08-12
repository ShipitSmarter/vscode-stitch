export const CONSTANTS = {
    integrationExtension: '.integration.json',
    scenariosDirectoryName: 'scenarios',
    importsDirectoryName: 'imports',
    httpFileExtension: '.http',

    panelTitlePrefix: 'Preview: ',
    statusbarTitlePrefix: 'Scenario: ',
    
    configKeyEndpointUrl: 'stitch.endpointUrl',
    configKeyDebounceTimeout: 'stitch.debounceTimeout',
    configKeyRootFolderName: 'stitch.rootFolderName',

    contextAvailableContextKey: 'stitch:contextAvailable',
    previewActiveContextKey: 'stitch:previewActive',

    httpStepResultTypeType: 'Core.Entities.StepResults.HttpStepResult, Core',
    renderTemplateStepResultType: 'Core.Entities.StepResults.RenderTemplateStepResult, Core',
    mailStepResultType: 'Core.Entities.StepResults.MailStepResult, Core',
    sftpStepResultType: 'Core.Entities.StepResults.SftpStepResult, Core',
    skippedStepResultType: 'Core.Entities.StepResults.SkippedStep, Core',

    httpStepConfigurationType: 'Core.Entities.Configs.Steps.HttpConfiguration, Core',
    renderTemplateStepConfigurationType: 'Core.Entities.Configs.Steps.RenderTemplateConfiguration, Core',

    defaultDebounceTimeout: 500,
    defaultRootFolderName: 'files',

    maxUpForRootFolder: 7,
};

export const MESSAGES = {
    endpointUrlNotConfigured: `The '${CONSTANTS.configKeyEndpointUrl}' is not configured, please set this up in File -> Preferences -> Settings`,
    debounceTimeoutNotConfigured: `The '${CONSTANTS.configKeyDebounceTimeout}' is not configured, please set this up in File -> Preferences -> Settings`
};

export const COMMANDS = {
    insertModelProperty: 'stitch.insertModelProperty',

    startPreview: 'stitch.preview',
    showTree: 'stitch.showTree',
    selectScenario: 'stitch.selectScenario',
    showScenarioSource: 'stitch.showScenarioSource',

    createHash: 'stitch.createHash',
    createSecret: 'stitch.createSecret',

    openTreeView: 'stitch:openTreeView'
};
