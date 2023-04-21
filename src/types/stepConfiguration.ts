export type StepConfiguration = BaseStepConfiguration | HttpStepConfiguration | MailStepConfiguration | RenderTemplateStepConfiguration | SftpStepConfiguration | HttpMulipartStepConfiguration;

export interface BaseStepConfiguration {
    $type: string;
    id: string;
    template: string;
    successCondition?: string;
    startCondition?: string;
}

export interface HttpStepConfiguration extends BaseStepConfiguration {
    method: string;
    encodingName: string;
    url: string;
    headers?: Record<string, string>;
}

export interface MailStepConfiguration extends BaseStepConfiguration {
    from: string;
    to: string[];
    subject: string;
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