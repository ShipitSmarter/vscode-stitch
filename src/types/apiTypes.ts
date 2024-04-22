import { StepConfiguration } from "./stepConfiguration";
import { StepResult } from "./stepResult";

export interface IntegrationRequestModel {
    integrationFilePath: string;
    files: FileInput[];
    scenarioFiles: FileInput[];
    scenarioName: string;
    prettyPrint: boolean;
}

export interface FileInput {
    filename: string;
    filecontent: string;
}

export interface StitchError {
    title: string;
    description: string;
}

export interface EditorSimulateIntegrationResponse {
    result: IntegrationResult;
    validFormat: boolean | undefined;
    formatErrorMessage: string;
    stepConfigurations: Record<string, StepConfiguration>;
    integrationContext: IntegrationContext;
    treeModel: Record<string, unknown>;
}

export interface IntegrationResult {
    body: string;
    statusCode: number;
    headers: Record<string, string>;
    outputType: StitchOutputType;
}

export enum StitchOutputType {
    json = 'Json',
    xml = 'Xml',
    plainText = 'PlainText',
    binaryAsBase64 = 'BinaryAsBase64' 
}


/* eslint-disable @typescript-eslint/naming-convention */
export interface ErrorData {
    ClassName?: string;
    Message?: string;
    message?: string;
    InnerException?: {
        Message: string;
    };
    StackTraceString: string;
    ResultBody: unknown;
}
export interface IntegrationContext {
    model: unknown;
    steps: Record<string, StepResult>; //StepsDictionary
}
