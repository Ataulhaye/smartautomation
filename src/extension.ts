// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateDocumentation } from './ollama/ollamaService';
import { HubViewProvider } from './UI/hub/hubViewProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const models = [
        "qwen2.5-coder:7b",
        "codellama",
    ];
    const userCode = `
nterms = int(input("How many terms? "))

n1, n2 = 0, 1
count = 0

if nterms <= 0:
   print("Please enter a positive integer")
elif nterms == 1:
   print("Fibonacci sequence upto",nterms,":")
   print(n1)
else:
   print("Fibonacci sequence:")
   while count < nterms:
       print(n1)
       nth = n1 + n2
       n1 = n2
       n2 = nth
       count += 1

# A class
class Claculator:
    # Initialize the Calculator class with no parameters
    def __init__(self):
        pass
    
    # Method to add two numbers
    def add(self, a, b):
        return a + b

    # Method to subtract one number from another
    def sub(self, a, b):
        return a - b
    `;

    for (const model of models) {
        generateDocumentation(userCode, model);
    }

    const hubViewProvider = new HubViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            HubViewProvider.viewType,
            hubViewProvider
        )
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
