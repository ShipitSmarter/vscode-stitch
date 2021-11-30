import * as vscode from 'vscode';
import { COMMANDS } from './constants';
import { ContextHandler } from './ContextHandler';
import { StitchEncode } from './StitchEncode';
import { StitchTreeProvider } from './StitchTreeProvider';

export function activate(context: vscode.ExtensionContext) {
	const encode = new StitchEncode();
	const treeView = vscode.window.createTreeView('stitch.modelTree', { treeDataProvider: ContextHandler.getTreeProvider() });

	context.subscriptions.push(
		ContextHandler.create(),

		// TreeProvider
		treeView,
		vscode.commands.registerCommand(COMMANDS.showTree, async () => treeView.reveal(await ContextHandler.getTreeProvider().getFirstRoot())),
		vscode.commands.registerCommand(COMMANDS.insertModelProperty, treeItem => ContextHandler.getTreeProvider().insertProperty(treeItem)),

		// Preview
		vscode.commands.registerCommand(COMMANDS.startPreview, () => ContextHandler.showPreview(context.extensionUri)),
		vscode.commands.registerCommand(COMMANDS.selectScenario, () => ContextHandler.selectScenario()),
		vscode.commands.registerCommand(COMMANDS.showScenarioSource, treeItem => StitchTreeProvider.openScenarioFile(treeItem)),

		// Encode
		vscode.commands.registerCommand(COMMANDS.createHash, async () => await encode.createHash()),
		vscode.commands.registerCommand(COMMANDS.createSecret, async () => await encode.createSecret()),
	);
}
