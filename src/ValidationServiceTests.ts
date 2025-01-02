import { ValidationService } from "./ValidationService";
import { exec } from "child_process";
import * as vscode from 'vscode';
import * as path from 'path';

export class TestValidationService {

    constructor() {  
        this.test_validation_working();
    }



    private async test_validation_working() {
        const pythonCode1 = `
        def hello_world():
            print("Hello, World!")
        `;

        const pythonCode = `a = 1`;
        const validationService = new ValidationService();
        // Python code to validate

        // Call the checkPythonSyntax method
        await validationService.checkPythonSyntaxAsync(pythonCode)
            .then(isValid => {
                if (isValid) {
                    console.log('Syntax is valid.');
                } else {
                    console.log('Syntax is invalid.');
                }
            })
            .catch(error => {
                console.error('Syntax check failed:', error);
            })
            .finally(() => {
                console.log('Syntax check completed.');
            });
    }

    private async test_validation_trying() {
        const pythonCode = `
        def hello_world():
            print("Hello, World!")
        `;
        
        // Example usage of runPythonScript function
        const scriptPath = 'C:/Users/ataul/SmartAutomation/smartautomation/src/validate_syntax.py';
        const vscode = require('vscode');

        const terminal = vscode.window.createTerminal('Test Terminal');
        terminal.show();
        terminal.sendText('echo Hello');
        terminal.sendText('python --version');
        terminal.sendText(`echo "${pythonCode}" | python ${scriptPath}`);
        var a = terminal.reciveText('echo Hello');

        //const result = await vscode.commands.executeCommand(`echo "${pythonCode}" | python ${scriptPath}`); 

      

        exec('echo Hello', { shell: 'C:\\Windows\\System32\\cmd.exe' }, (error, stdout, stderr) => {
            if (error) {
                console.error('Exec failed:', error.message);
            } else {
                console.log('Shell output:', stdout.trim());
            }
        });

        console.log('Environment Variables:', process.env);
        process.env.PATH = `${process.env.PATH};C:\\Windows\\System32`;

        exec('echo Hello', (error, stdout, stderr) => {
            if (error) {
                console.error('Exec failed:', error.message);
            } else {
                console.log('Shell output:', stdout.trim());
            }
        });


        exec('python --version', (error, stdout, stderr) => {
            if (error) {
                console.error('Python is not accessible:', error.message);
            } else {
                console.log('Python version:', stdout.trim());
            }
        });


        validatePythonCodeWorking(pythonCode, scriptPath)
            .then((result) => {
                console.log('Validation result:', result);
            })
            .catch((err) => {
                console.error('Validation failed:', err.message);
            });

        const validationService = new ValidationService();
        // Python code to validate
        
        // Call the checkPythonSyntax method
        await validationService.checkPythonSyntaxAsync(pythonCode)
            .then(isValid => {
                if (isValid) {
                    console.log('Syntax is valid.');
                } else {
                    console.log('Syntax is invalid.');
                }
            })           
            .catch(error => {
                console.error('Syntax check failed:', error);
            })
            .finally(() => {
                console.log('Syntax check completed.');
            });
    }
}

export function validatePythonCodeWorking(code:any, scriptPath:any) {
    return new Promise((resolve, reject) => {
        console.log('Resolved script path:', scriptPath);

        // Run the Python script with exec()
        const process = exec(`python ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Failed to execute Python script: ${error.message}`));
                return;
            }
            if (stderr) {
                reject(new Error(`Python stderr: ${stderr}`));
                return;
            }
            try {
                const result = JSON.parse(stdout.trim().replace(/'/g, '"'));
                resolve(result);
            } catch (parseError) {
                reject(new Error('Failed to parse Python output'));
            }
        });

        // Pass the Python code as stdin
        if (process.stdin) {
            process.stdin.write(code);
            process.stdin.end();
        }
    });
}







