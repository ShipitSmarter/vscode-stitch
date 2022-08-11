export type StepConfiguration = BaseStepConfiguration | HttpStepConfiguration | MailStepConfiguration | RenderTemplateStepConfiguration | SftpStepConfiguration;

export interface BaseStepConfiguration {
    $type: string;
    id: string;
    template: string;
    successCondition?: string;
    startCondition?: string;
}

export interface HttpStepConfiguration extends BaseStepConfiguration {
    method: string;
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
}

export interface SftpStepConfiguration extends BaseStepConfiguration {
    host: string;
    port: number;
    username: string;
    password: string;
    filename: string;
    path?: string;
}