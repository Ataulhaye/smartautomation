// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { displayHUBPrimarySidebar } from './UI/hub/hubViewProvider';
import { TestLLMService } from './llmServiceTests';
import { TestValidationService } from './ValidationServiceTests';
import * as path from 'path';
import { LLMService } from './llmService';
import { OpenAIService } from './OpenAIService';


// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

    // displays the HUB view in the Primary Sidebar
    displayHUBPrimarySidebar(context);
  
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('smartautomation.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from smartautomation!');		
	});

	/**
	//How to test LLM Service
	const a = new TestLLMService();

	//How to Test the validation service
	const validate = new TestValidationService(validationScriptPath);
	 */

	context.subscriptions.push(disposable);

}

// This method is called when your extension is deactivated
export function deactivate() {}