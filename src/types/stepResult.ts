
export type StepResult = BaseStepResult | HttpStepResult | RenderTemplateStepResult | LoopStepResult | MailStepResult | CacheLoadResult | CacheStoreResult;

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
    };

    model: unknown;
}

export interface RenderTemplateStepResult extends BaseStepResult {
    response: {
        content: string;
        contentType: string;
        statusCode: number;
        isSuccessStatusCode: boolean;
        errorMessage: string;
    };
}

export interface LoopStepResult extends BaseStepResult {
    count: number;
    index: number;
}

export interface MailStepResult extends BaseStepResult {
    providedSuccessFull: boolean;
}

export interface CacheLoadResult extends BaseStepResult {
    providedSuccessFull: boolean;
    model: unknown;
}

export interface CacheStoreResult extends BaseStepResult {
    storedSuccessfull: boolean;
}
