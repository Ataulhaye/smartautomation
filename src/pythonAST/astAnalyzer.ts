import * as vscode from 'vscode';
import { spawn } from 'child_process';

export function analyzePythonCode(pythonCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['C:/Users/danie/Desktop/_WS24_25/SWeng/smartautomation/src/pythonAST/ast_parser.py']);

        let output = '';
        let error = '';

        pythonProcess.stdin.write(pythonCode);
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    if (result.success) {
                        resolve(result.ast); // Return AST
                    } else {
                        reject(`Syntax Error: ${result.error} at line ${result.lineno}, col ${result.col_offset}`);
                    }
                } catch (err) {
                    reject(`Error parsing JSON: ${err}`);
                }
            } else {
                reject(`Python script failed: ${error}`);
            }
        });
    });
}