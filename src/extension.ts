// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TestLLMService } from './llmServiceTests';
import { TestValidationService } from './ValidationServiceTests';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "smartautomation" is now active!');

	const config = vscode.workspace.getConfiguration('pythonAutoComment');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('smartautomation.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from smartautomation!');		
	});

	const validate = new TestValidationService();

	//How to Test the service
	const tm = new TestLLMService(config);
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
