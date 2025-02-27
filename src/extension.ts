import * as vscode from 'vscode';
import { displayHUBPrimarySidebar } from './UI/hub/hubViewProvider';
import { AutoCommenter } from './AutoCommenter';

export function activate(context: vscode.ExtensionContext) {

	// displays the HUB view in the Primary Sidebar
	//displayHUBPrimarySidebar(context);

	new AutoCommenter(context);

}


// This method is called when your extension is deactivated
export function deactivate() {}
