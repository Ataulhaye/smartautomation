import * as vscode from 'vscode';
import { generateDocumentation } from '../../ollama/ollamaService';
import { LLMService } from '../../llmService';
import { ValidationService } from '../../ValidationService';

export function displayHUBPrimarySidebar(context: vscode.ExtensionContext) {
  const hubViewProvider = new HubViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      HubViewProvider.viewType,
      hubViewProvider
    )
  );
}

export class HubViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'hubView';
  private _view?: vscode.WebviewView;
  private context: vscode.ExtensionContext;
  private valdSer: ValidationService;
  private llmSer: LLMService;

  constructor(
    private readonly _extensionUri: vscode.Uri, 
    context: vscode.ExtensionContext
  ) {
    this.context = context;
    this.valdSer = new ValidationService();
    this.llmSer = new LLMService();
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // Set up webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.options = {
      enableScripts: true
    };

    const styleUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles', 'styles.css')
    );

    this._view.webview.html = this.getHtmlContent(styleUri);

    webviewView.webview.onDidReceiveMessage(async message => {
      if (message.command === 'commentFile') {

        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const document = editor.document;
          const content = document.getText().trim();
          //const documentedCode = await generateDocumentation(content, 'qwen2.5-coder:7b');
          const documentedCode = await this.llmSer.queryLLMModelAsync(content);
          let diff = '';
          await this.valdSer.checkPythonSyntaxAsync(documentedCode).then(isValid => {
            if (isValid) {
              diff = generateDiff(content, documentedCode);
              console.log('Syntax is valid.');
            } else {
              diff = generateDiff(content, content);
              console.log('Syntax is invalid.');
            }
          }).catch(error => {
            diff = generateDiff(content, content);
            console.error('Syntax check failed:', error);
          });

          const highlightedContent = highlightChanges(diff);

          await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            );
            editBuilder.replace(fullRange, highlightedContent);
          });

          webviewView.webview.postMessage({ command: 'showAcceptDismissButtons' });
        }
      } else if (message.command === 'acceptChanges') {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const document = editor.document;
          const content = document.getText();
          const cleanedContent = removeHighlighting(content);

          await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            );
            editBuilder.replace(fullRange, cleanedContent);
          });

          
          webviewView.webview.postMessage({ command: 'hideAcceptDismissButtons' });
        }
      } else if (message.command === 'dismissChanges') {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const document = editor.document;
          const originalContent = message.originalContent;

          await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            );
            editBuilder.replace(fullRange, originalContent);
          });

          webviewView.webview.postMessage({ command: 'hideAcceptDismissButtons' });
        }
      }
    });

    vscode.workspace.onDidSaveTextDocument(async (document) => {
      console.log(document.languageId);
      if (document.languageId === 'python') {
          const userCode = document.getText();
          const commentWorthyLines = scanForCommentWorthyLines(userCode);
          const uncommentedCode = checkIfLinesAreCommented(userCode, commentWorthyLines);
          console.log('Uncommented code:', uncommentedCode);
          const model = 'qwen2.5-coder:7b';
        
          try {
              console.log('Analyzing code for comments...');
              const commentedCode = await generateDocumentation(userCode, model);
              
        } catch (error) {
          console.error('Error generating comments:', error);
        }
      }
    });
  }

  private getHtmlContent(styleUri: vscode.Uri): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href=${styleUri} rel="stylesheet">
        <title>HUB</title>
        <script>
          const vscode = acquireVsCodeApi();
          function commentFile() {
            vscode.postMessage({ command: 'commentFile' });
          }
          function acceptChanges() {
            vscode.postMessage({ command: 'acceptChanges' });
          }
          function dismissChanges() {
            vscode.postMessage({ command: 'dismissChanges', originalContent: document.getElementById('original-content').value });
          }
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'showAcceptDismissButtons') {
              document.getElementById('accept-dismiss-buttons').style.display = 'block';
            } else if (message.command === 'hideAcceptDismissButtons') {
              document.getElementById('accept-dismiss-buttons').style.display = 'none';
            }
          });
        </script>
      </head>
      <body>
        <button onclick="commentFile()">Comment file</button>
        <div id="accept-dismiss-buttons" style="display: none;">
          <button onclick="acceptChanges()">Accept</button>
          <button onclick="dismissChanges()">Dismiss</button>
        </div>
      </body>
      </html>
    `;
  }
}

function generateDiff(oldContent: string, newContent: string): string {
  // Implement a diff algorithm or use a library to generate the diff
  return newContent;
}

function highlightChanges(diff: string): string {
  // Implement highlighting logic
  return diff;
}

function removeHighlighting(content: string): string {
  // Implement logic to remove highlighting
  return content;
}

export function scanForCommentWorthyLines(code: string): number[] {
  const lines = code.split('\n');
  const commentWorthyLines: number[] = [];
  const methodOrClassRegex = /^\s*(def|class)\s+\w+/;

  lines.forEach((line, index) => {
    if (methodOrClassRegex.test(line) || line.includes('# Important')) {
      commentWorthyLines.push(index);
    }
    
  });

  return commentWorthyLines;
}

export function checkIfLinesAreCommented(code: string, linesToCheck: number[]): boolean[] {
  const lines = code.split('\n');
  return linesToCheck.map(lineNumber => {
    const previousLine = lines[lineNumber - 1].trim();
    console.log('Checking line:', previousLine);
    return previousLine.startsWith('#') || previousLine.startsWith('"""') || previousLine.startsWith("'''");
  });
}
