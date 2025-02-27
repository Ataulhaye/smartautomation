import * as vscode from 'vscode';
import { AutoCommenter } from './AutoCommenter';

export function activate(context: vscode.ExtensionContext) {

	new AutoCommenter(context);
	
}

// This method is called when your extension is deactivated
export function deactivate() {}
