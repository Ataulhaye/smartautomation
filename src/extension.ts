// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { displayHUBPrimarySidebar } from './UI/hub/hubViewProvider';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

    // Only for testing purposes, remove this line before deployment
    // testCommentGeneration();

    // displays the HUB view in the Primary Sidebar
    displayHUBPrimarySidebar(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}