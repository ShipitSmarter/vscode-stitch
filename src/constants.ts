export const CONSTANTS = {
    integrationExtensions: ['.integration.json', '.integration.yaml', '.integration.yml'],
    scenariosDirectoryName: 'scenarios',
    importsDirectoryName: 'imports',
    httpFileExtension: '.http',

    importConfigsFilename: 'imports.configs.yaml',

    panelTitlePrefix: 'Preview: ',
    statusbarTitlePrefix: 'Scenario: ',
    
    configKeyEndpointUrl: 'stitch.endpointUrl',
    configKeyDebounceTimeout: 'stitch.debounceTimeout',
    configKeyRootFolderName: 'stitch.rootFolderName',
    configKeyMaxDirsUpToFindRootFolder: 'stitch.maxDirsUpToFindRootFolder',
    configKeyPrettyPrint: 'stitch.prettyPrint',

    contextAvailableContextKey: 'stitch:contextAvailable',
    previewActiveContextKey: 'stitch:previewActive',

    httpStepResultTypeType: 'Core.Entities.StepResults.HttpStepResult, Core',
    renderTemplateStepResultType: 'Core.Entities.StepResults.RenderTemplateStepResult, Core',
    mailStepResultType: 'Core.Entities.StepResults.MailStepResult, Core',
    sftpStepResultType: 'Core.Entities.StepResults.SftpStepResult, Core',
    skippedStepResultType: 'Core.Entities.StepResults.SkippedStep, Core',
    loopStepResultType: 'Core.Entities.StepResults.LoopResult, Core',
    base64EncodeStepResultType: 'Core.Entities.StepResults.Base64EncodeStepResult, Core',
    cacheLoadStepResultType: 'Core.Entities.StepResults.CacheLoadResult, Core',
    cacheStoreStepResultType: 'Core.Entities.StepResults.CacheStoreResult, Core',

    httpStepConfigurationType: 'Core.Entities.Configs.Steps.HttpConfiguration, Core',
    httpMultipartStepConfigurationType: 'Core.Entities.Configs.Steps.HttpMultipartConfiguration, Core',
    renderTemplateStepConfigurationType: 'Core.Entities.Configs.Steps.RenderTemplateConfiguration, Core',
    base64EncodeStepConfigurationType: 'Core.Entities.Configs.Steps.Base64EncodeConfiguration, Core',
    cacheLoadStepConfigurationType: 'Core.Entities.Configs.Steps.CacheLoadConfiguration, Core',
    cacheStoreStepConfigurationType: 'Core.Entities.Configs.Steps.CacheStoreConfiguration, Core',

    defaultDebounceTimeout: 500,
    defaultRootFolderName: 'files',
    defaultDirsToFindRootFolder: 7,
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

    openTreeView: 'stitch:openTreeView'
};
