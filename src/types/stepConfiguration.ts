export type StepConfiguration = BaseStepConfiguration | HttpStepConfiguration | MailStepConfiguration | RenderTemplateStepConfiguration | SftpStepConfiguration | HttpMulipartStepConfiguration | LoopStepConfiguration | Base64EncodeStepConfiguration | CacheLoadStepConfiguration | CacheStoreStepConfiguration;

export interface BaseStepConfiguration {
    $type: string;
    id: string;
    template: string;
    successCondition?: string;
    startCondition?: string;
}

export interface RetryConfiguration {
    maxRetries: number;
    delaysMs: number[] | undefined;
}

export interface HttpStepConfiguration extends BaseStepConfiguration {
    method: string;
    encodingName: string;
    url: string;
    headers?: Record<string, string>;
    validFormat: boolean | undefined;
    formatErrorMessage : string;
    retries?: RetryConfiguration;
}

export interface MailStepConfiguration extends BaseStepConfiguration {
    from: string;
    to: string[];
    subject: string;
    replyToList: string[];
}

export interface RenderTemplateStepConfiguration extends BaseStepConfiguration {
    additionalFiles?: string[];
    encodingName: string;
}

export interface SftpStepConfiguration extends BaseStepConfiguration {
    host: string;
    port: number;
    username: string;
    password: string;
    filename: string;
    path?: string;
    encodingName: string;
}

export interface LoopStepConfiguration extends BaseStepConfiguration {
    iterationCount: string;
    continueOnError: boolean;
    step: StepConfiguration;
}

export interface Base64EncodeStepConfiguration extends BaseStepConfiguration {
    encodingName: string;
}

export interface CacheLoadStepConfiguration extends BaseStepConfiguration {
    key: string;
}

export interface CacheStoreStepConfiguration extends BaseStepConfiguration {
    key: string;
    allowOverwrite: string;
}

export interface HttpMulipartStepConfiguration extends BaseStepConfiguration {
    method: string;
    url: string;
    headers?: Record<string, string>;
    parts: MultipartContentItem[];
}

export interface MultipartContentItem {
    template: string;
    encodingName: string;
    headers?: Record<string, string>;
    outputBase64AsBinary: boolean;
}