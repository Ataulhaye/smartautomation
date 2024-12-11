// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { LLMService } from './llmService';
import { TestLLMService } from './llmServiceTests';
import { generateDocumentation } from './ollama/ollamaService';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "smartautomation" is now active!');

	//const tm = new TestLLMService();

    const models = [
        "qwen2.5-coder:7b",
        "codellama",
    ];
    const userCode = `
nterms = int(input("How many terms? "))

n1, n2 = 0, 1
count = 0

if nterms <= 0:
   print("Please enter a positive integer")
elif nterms == 1:
   print("Fibonacci sequence upto",nterms,":")
   print(n1)
else:
   print("Fibonacci sequence:")
   while count < nterms:
       print(n1)
       nth = n1 + n2
       n1 = n2
       n2 = nth
       count += 1
    `;
    for (const model of models) {
        generateDocumentation(userCode, model);
    }


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
