
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
