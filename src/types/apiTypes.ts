import { StepConfiguration } from "./stepConfiguration";
import { StepResult } from "./stepResult";

export interface IntegrationRequestModel {
    integrationFilePath: string;
    files: FileInput[];
    scenarioFiles: FileInput[];
    scenarioName: string;
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
    stepConfigurations: Record<string, StepConfiguration>;
    integrationContext: IntegrationContext;
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

export interface DetectedModel {
    httpRequest?: HttpRequestModel;
    httpResponse?: HttpResponseModel;
    model: string | FormatModel; // FormatModel is here for backwards compatibility
}

export interface HttpRequestModel {
    method: string;
    headers: Record<string, string>;
    query: Record<string, string[]>;
    queryString: Record<string, string>;
    route: Record<string, string>;
}

export interface HttpResponseModel {
    statusCode: number;
    headers: Record<string, string>;
}

// Backwards compatibility
// ----------------------------------------
export interface FormatModel {
    format: Format;
    formattedInput: string;
    formattedJson: string;
}
export enum Format {
    unknown = 'Unknown',
    json = 'Json',
    xml = 'Xml',
    binary = 'Binary',
}
// ----------------------------------------
