import { LLMService } from './LLMService';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	const llmservice: LLMService = new LLMService();

	vscode.commands.registerCommand('smartautomation.helloWorld', () => {
		llmservice.generateComment();
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
