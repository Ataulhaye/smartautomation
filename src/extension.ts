// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ModalLoader } from './modelLoader';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "smartautomation" is now active!');

	const modelLoader = new ModalLoader();
	const code = "def add_numbers(num1, num2): return num1 + num2";
	const prompt = `Given this Python code:
	"${code}"
	Write a brief, clear inline comment explaining what this line does. Format: # comment
	Keep it concise and technical.`;

	const response = modelLoader.queryModel(prompt);


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('smartautomation.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from smartautomation!');		
	});


	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
