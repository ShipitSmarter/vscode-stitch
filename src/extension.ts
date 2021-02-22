import * as vscode from 'vscode';
import { COMMANDS } from './constants';
import { StitchEncode } from './StitchEncode';
import { StitchPreview } from './StitchPreview';
import { StitchTreeProvider } from './StitchTreeProvider';

export function activate(context: vscode.ExtensionContext) {

	const treeProvider = new StitchTreeProvider(context);
	const encode = new StitchEncode();

	context.subscriptions.push(
		// TreeProvider
		vscode.window.registerTreeDataProvider('stitch.modelTree', treeProvider),
		vscode.commands.registerCommand(COMMANDS.insertModelProperty, treeItem => treeProvider.insertProperty(treeItem)),
		vscode.commands.registerCommand(COMMANDS.responseUpdated, () => treeProvider.refresh()),

		// Preview
		vscode.commands.registerCommand(COMMANDS.startPreview, () => StitchPreview.createOrShow(context.extensionUri, vscode.window.activeTextEditor)),
		vscode.commands.registerCommand(COMMANDS.selectScenario, () => StitchPreview.selectScenario()),
		vscode.commands.registerCommand(COMMANDS.showScenarioSource, treeItem => StitchPreview.openScenarioFile(treeItem)),

		// Encode
		vscode.commands.registerCommand(COMMANDS.createHash, async () => await encode.createHash()),
		vscode.commands.registerCommand(COMMANDS.createSecret, async () => await encode.createSecret())
	);

}
