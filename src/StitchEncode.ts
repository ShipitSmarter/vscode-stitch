import axios from 'axios';
import * as vscode from 'vscode';
import { CONSTANTS, MESSAGES } from './constants';

export class StitchEncode {

    public async createHash(): Promise<void> {
        
        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            void vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

        const content = await this._showContentInput();
        if (!content) { return; }

        const data = { content };
        const result = await axios.post(`${endpoint}/encode/createhash`, data);
        this._insertEncodedValue((<EncodeResult>result.data).encodedValue, 'Secret created and copied to clipboard!');
    }

    private async _showContentInput(): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            placeHolder: 'Enter the value to be encrypted'
        });
    }

    private _insertEncodedValue(encodedValue: string, clipboardMessage: string): void  {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { 
            void vscode.env.clipboard.writeText(encodedValue);
            void vscode.window.showInformationMessage(clipboardMessage);
            return;
        }

        void editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, encodedValue);
        });
    }
}

interface EncodeResult {
    encodedValue: string;
}
