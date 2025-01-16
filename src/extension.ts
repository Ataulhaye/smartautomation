// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TestLLMService } from './llmServiceTests';
import { TestValidationService } from './ValidationServiceTests';
import * as path from 'path';
import { LLMService } from './llmService';
import { OpenAIService } from './OpenAIService';
import { AzureOpenAIService } from './AzureOpenAIService';



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "smartautomation" is now active!');

	const config = vscode.workspace.getConfiguration("LLM");
	if (!config) {
		console.error('Failed to load configuration');
		return;
	}

	const rootPath = context.extensionPath;
	const validationScriptPath = path.join(rootPath, 'src', 'validate_syntax.py');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('smartautomation.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from smartautomation!');		
	});

	const serviceTest = new TestLLMService(config);


	/** 
	try {
		// Create and test OpenAI service
		const openAIService = new AzureOpenAIService(config);
		openAIService.testConnection().then(() => {
			console.log('Successfully connected to OpenAI');
		}).catch(error => {
			console.error('Failed to connect to OpenAI:', error);
		});


		// Example usage
		async function generatePythonComments(pythonCode: string) {
			try {
				const comments = await openAIService.generatePythonCommentsAzure(pythonCode);
				return comments;
			} catch (error) {
				console.error('Error generating comments:', error);
				throw error;
			}
		}

		// Test the service with a sample code
		generatePythonComments('def example(): pass').then(comments => {
			console.log('Test comments generated:', comments);
		}).catch(error => {
			console.error('Test failed:', error);
		});

	} catch (error) {
		console.error('Failed to initialize OpenAI service:', error);
	}
*/

/**
try {
	// Create and test OpenAI service
	const openAIService = new OpenAIService(config);
	openAIService.testConnection().then(isConnected => {
		if (isConnected) {
			console.log('Successfully connected to OpenAI');
		} else {
			console.error('Failed to connect to OpenAI');
		}
	});

		
	// Example usage
	async function generatePythonComments(pythonCode: string) {
		try {
			const comments = await openAIService.generatePythonComments(pythonCode);
			return comments;
		} catch (error) {
			console.error('Error generating comments:', error);
			throw error;
		}
	}

	// Test the service with a sample code
	generatePythonComments('def example(): pass').then(comments => {
		console.log('Test comments generated:', comments);
	}).catch(error => {
		console.error('Test failed:', error);
	});
		
} catch (error) {
	console.error('Failed to initialize OpenAI service:', error);
}
*/
	/**

	const a = new TestLLMService(config);

	//How to Test the validation service
	const validate = new TestValidationService(validationScriptPath);

	 */
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
