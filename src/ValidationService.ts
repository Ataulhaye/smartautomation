import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from 'vscode';
import * as path from 'path';


const execAsync = promisify(exec);

export class ValidationService {
    private pythonScriptPath: string;

    constructor() {
        this.pythonScriptPath = this.getPythonScriptPath();
    }
    
    private getPythonScriptPath(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to use this extension.');
            throw new Error('No workspace folder is open');
        }
        //const a = context.extensionPath;

        const scriptPath = path.join(workspaceFolders[0].uri.fsPath, 'src', 'validate_syntax.py');
        return scriptPath;
    }

    public async checkPythonSyntaxAsync(code: string): Promise<boolean> {
        try {
            //const scriptPath = 'C:/Users/ataul/TestExtension/AtaExtension/ata/src/validate_syntax.py';
            const { stdout, stderr } = await execAsync(`echo "${code}" | python ${this.pythonScriptPath}`);

            if (stderr) {
                console.error('Error:', stderr);
                return false;
            }
            let pyRes = JSON.parse(stdout.trim());

            if (pyRes.valid) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Syntax check failed:', error);
            return false;
        }
    }
}