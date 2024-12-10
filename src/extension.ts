import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LLMService } from './LLMService'; // Import the LLMService

export function activate(context: vscode.ExtensionContext) {
    // Output channel for showing text
    const outputChannel = vscode.window.createOutputChannel("SmartAutomation");
    const llmService = new LLMService(); // Initialize the LLMService

    // Command: Show Text in Output Panel
    const showTextInOutput = vscode.commands.registerCommand('smartautomation.showTextInOutput', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No editor is active.');
            return;
        }

        // Get selected text or full document
        const selection = editor.selection;
        const text = selection.isEmpty
            ? editor.document.getText() // Full document
            : editor.document.getText(selection); // Selected text

        // Display text in output panel
        outputChannel.clear();
        outputChannel.appendLine("Collected Text:");
        outputChannel.appendLine(text);
        outputChannel.show();
    });

    // Command: Show Text in Output Panel and Save to File
    const showTextAndSaveToFile = vscode.commands.registerCommand('smartautomation.showTextAndSaveToFile', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No editor is active.');
            return;
        }

        // Get selected text or full document
        const selection = editor.selection;
        const text = selection.isEmpty
            ? editor.document.getText() // Full document
            : editor.document.getText(selection); // Selected text

        // Display text in output panel
        outputChannel.clear();
        outputChannel.appendLine("Collected Text:");
        outputChannel.appendLine(text);
        outputChannel.show();

        // Determine the file path to save the text
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }

        const filePath = path.join(workspaceFolder, 'rawCollectedText.txt');

        // Write the raw text to a file (no escaped characters)
        try {
            fs.writeFileSync(filePath, text, 'utf8');
            vscode.window.showInformationMessage(`Raw text saved to ${filePath}`);
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to save file: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred while saving the file.');
            }
        }
    });

    // Command: Send Text to Local LLM and Display Response
    const sendToLLMAndDisplay = vscode.commands.registerCommand('smartautomation.sendToLLM', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No editor is active.');
            return;
        }

        // Get selected text or full document
        const selection = editor.selection;
        const code = selection.isEmpty
            ? editor.document.getText() // Full document
            : editor.document.getText(selection); // Selected text

        // Prompt for LLM to execute
        const prompt = "Add comments and docstrings to this code.";

        try {
            // Use LLMService to generate response
            const response = await llmService.generateComment(prompt, code);

            // Display the LLM response in the Output panel
            outputChannel.clear();
            outputChannel.appendLine("Response from LLM:");
            outputChannel.appendLine(response);
            outputChannel.show();
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to communicate with LLM: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred while communicating with LLM.');
            }
        }
    });

    // Register commands
    context.subscriptions.push(showTextInOutput);
    context.subscriptions.push(showTextAndSaveToFile);
    context.subscriptions.push(sendToLLMAndDisplay);
}

export function deactivate() { }
