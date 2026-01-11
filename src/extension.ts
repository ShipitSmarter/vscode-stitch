import * as vscode from 'vscode';
import { COMMANDS } from './constants';
import { ContextHandler } from './ContextHandler';
import { StitchEncode } from './StitchEncode';
import { StitchTreeProvider } from './StitchTreeProvider';
import { StitchPreview } from './StitchPreview';
import { TreeItem } from './types';

export function activate(context: vscode.ExtensionContext): void {
    const encode = new StitchEncode();
    const treeView = vscode.window.createTreeView('stitch.modelTree', { treeDataProvider: ContextHandler.getTreeProvider() });
    const previewProvider = new StitchPreview(context.extensionUri);

    context.subscriptions.push(
        ContextHandler.create(),

        // TreeProvider
        treeView,
        vscode.commands.registerCommand(COMMANDS.showTree, async () => treeView.reveal(await ContextHandler.getTreeProvider().getFirstRoot())),
        vscode.commands.registerCommand(COMMANDS.insertModelProperty, (treeItem: TreeItem) => ContextHandler.getTreeProvider().insertProperty(treeItem)),

        // Preview
        vscode.window.registerWebviewViewProvider('stitch.preview', previewProvider),
        vscode.commands.registerCommand(COMMANDS.startPreview, () => ContextHandler.showPreview(previewProvider)),
        vscode.commands.registerCommand(COMMANDS.selectScenario, () => ContextHandler.selectScenario()),
        vscode.commands.registerCommand(COMMANDS.showScenarioSource, (treeItem: TreeItem) => StitchTreeProvider.openScenarioFile(treeItem)),
        vscode.commands.registerCommand(COMMANDS.pinIntegration, () => ContextHandler.togglePinned()),
        vscode.commands.registerCommand(COMMANDS.unpinIntegration, () => ContextHandler.togglePinned()),

        // Encode
        vscode.commands.registerCommand(COMMANDS.createHash, async () => await encode.createHash()),
    );
}
