import axios from 'axios';
import * as vscode from 'vscode';
import { CONSTANTS, MESSAGES } from './constants';

export class StitchEncode {

	public async createHash() {
        
        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

        const content = await this._showContentInput();
		if (!content) { return; }

        const data = { content };
        const result = await axios.post(`${endpoint}/encode/createhash`, data);
        this._insertEncodedValue(result.data.encodedValue, 'Secret created and copied to clipboard!');
	}    

	public async createSecret() {

        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            vscode.window.showErrorMessage(MESSAGES.endpointUrlNotConfigured);
            return;
        }

		const environment = await this._showPickEnvironment();
		if (!environment) { return; }
		const content = await this._showContentInput();
		if (!content) { return; }

        const data = { environment, content };
        const result = await axios.post(`${endpoint}/encode/createsecret`, data);
		this._insertEncodedValue(result.data.encodedValue, 'Secret created and copied to clipboard!');
	}

	async _showPickEnvironment(): Promise<string | undefined> {
		return await vscode.window.showQuickPick(['test', 'acceptance', 'production'], {
			placeHolder: 'Select the environment for the Secret'
		});
	}

	async _showContentInput(): Promise<string | undefined> {
		return await vscode.window.showInputBox({
			placeHolder: 'Enter the value to be encrypted'
		});
	}

	private _insertEncodedValue(encodedValue: string, clipboardMessage: string): void  {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { 
			vscode.env.clipboard.writeText(encodedValue);
			vscode.window.showInformationMessage(clipboardMessage);	
			return;
		}
        
        editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, encodedValue);
        });
    }
}
