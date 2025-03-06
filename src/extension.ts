/*
 * Copyright (c) 2025 Ata Ul Haye.
 *
 * All rights reserved.
 *
 * This project, "Python Smart Automation" extension, including all associated source code,
 * documentation, and related files, is the intellectual property of Ata Ul Haye. You may
 * use, modify, and distribute this project in accordance with the terms of the MIT License.
 */

import * as vscode from 'vscode';
import { AutoCommenter } from './AutoCommenter';

export function activate(context: vscode.ExtensionContext) {
    const autoCommenter = new AutoCommenter(context);

    context.subscriptions.push(
		vscode.commands.registerCommand('smartautomation.reopenPanel', () => {
			autoCommenter.reopenPanel();
        })
    );
	
	// Create a status bar item to reopen the panel
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.command = 'smartautomation.reopenPanel'; 
	statusBarItem.text = '$(eye) Open Smart Automation Sidebar'; 
	statusBarItem.tooltip = 'Click to reopen the Smart Automation Sidebar'; 
	statusBarItem.show(); 

	context.subscriptions.push(statusBarItem);
}

// This method is called when your extension is deactivated
export function deactivate() {}
