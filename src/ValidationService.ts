import { spawn } from "child_process";
import * as vscode from 'vscode';
import * as path from 'path';

export class ValidationService {
    private pythonScriptPath: string;

    constructor() {
        const rootPath = vscode.extensions.getExtension('Ata_Daniel.smartautomation')?.extensionPath || '';
        const validationScriptPath = path.join(rootPath, 'src', 'validate_syntax.py');
        this.pythonScriptPath = validationScriptPath;

        if (!this.pythonScriptPath) {
            throw new Error('Validation ScriptPath is required');
        }
    }

    public async checkPythonSyntaxAsync(code: string): Promise<boolean> {
        try {
            //console.log('Validating Path:', this.pythonScriptPath);

            const serializedCode = JSON.stringify(code);
            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

            const { stdout, stderr } = await new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
                const process = spawn(pythonCmd, [this.pythonScriptPath]);
                let stdout = '';
                let stderr = '';

                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                process.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Process exited with code ${code}`));
                    } else {
                        resolve({ stdout, stderr });
                    }
                });

                process.stdin.write(serializedCode);
                process.stdin.end();
            });

            if (stderr) {
                console.error('Error:', stderr);
                return false;
            }
            let pyRes = JSON.parse(stdout.trim());
        
            return pyRes.valid;
    
        } catch (error) {
            console.error('Syntax check failed:', error);
            return false;
        }
    }
}