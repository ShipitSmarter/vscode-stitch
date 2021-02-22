import axios from 'axios';
import * as vscode from 'vscode';
import { CONSTANTS } from './constants';

export class StitchEncode {

	public async createHash() {
        
        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            vscode.window.showErrorMessage(`The '${CONSTANTS.configKeyEndpointUrl}' is not configured, please set this up in Preferences -> Settings`);
            return;
        }

        const content = await this._showContentInput();
		if (!content) { return; }

        const data = { content };
        const result = await axios.post(`${endpoint}/encode/createhash`, data);
        vscode.env.clipboard.writeText(result.data.encodedValue);
		vscode.window.showInformationMessage(`Hash created and copied to clipboard!`);
	}    

	public async createSecret() {

        const endpoint = vscode.workspace.getConfiguration().get<string>(CONSTANTS.configKeyEndpointUrl);
        if (!endpoint) {
            vscode.window.showErrorMessage(`The '${CONSTANTS.configKeyEndpointUrl}' is not configured, please set this up in Preferences -> Settings`);
            return;
        }

		const environment = await this._showPickEnvironment();
		if (!environment) { return; }
		const content = await this._showContentInput();
		if (!content) { return; }

        const data = { environment, content };
        const result = await axios.post(`${endpoint}/encode/createsecret`, data);
        vscode.env.clipboard.writeText(result.data.encodedValue);
		vscode.window.showInformationMessage(`Secret created and copied to clipboard!`);
	}

	async _showPickEnvironment(): Promise<string | undefined> {
		return await vscode.window.showQuickPick(['acceptance', 'production'], {
			placeHolder: 'Select the environment for the Api key'
		});
	}

	async _showContentInput(): Promise<string | undefined> {
		return await vscode.window.showInputBox({
			placeHolder: 'Enter the value to be encrypted'
		});
	}
}
