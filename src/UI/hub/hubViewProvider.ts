import * as vscode from 'vscode';
import { generateDocumentation } from '../../ollama/ollamaService';
import { LLMService } from '../../llmService';
import { ValidationService } from '../../ValidationService';
import * as Diff from 'diff';

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

  private savedFileContent: string = '';
  private decorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({});
  private selectedFiles: string[] = [];

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
      console.log('Received message:', message);
      if (message.command === 'commentFile') {
        const files = message.files;
        for (const file of files) {
          const document = await vscode.workspace.openTextDocument(file);
          const content = document.getText();
          console.log('File content:', content);
          // Process the content as needed
        }
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const document = editor.document;
          this.savedFileContent = document.getText();
          const content = document.getText().trim();
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
            editBuilder.replace(fullRange, documentedCode);
          });

          this.decorationType = await applyChangesWithHighlights(this.savedFileContent, documentedCode);

          webviewView.webview.postMessage({ command: 'showAcceptDismissButtons' });
        }
      } else if (message.command === 'acceptChanges') {
        console.log('Accepting changes');
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const document = editor.document;
          const content = document.getText();

          await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            );
            editBuilder.replace(fullRange, content);
          });

          this.decorationType.dispose();
          
          webviewView.webview.postMessage({ command: 'hideAcceptDismissButtons' });
        }
      } else if (message.command === 'dismissChanges') {
        console.log('Dismissing changes');
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const document = editor.document;
          const originalContent = this.savedFileContent;

          await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            );
            editBuilder.replace(fullRange, originalContent);
          });
          
          this.decorationType.dispose();

          webviewView.webview.postMessage({ command: 'hideAcceptDismissButtons' });
        }
      } else if (message.command === 'addFiles') {
        const f = vscode.workspace.workspaceFolders;
        let g: string = '';
        if (f) {
          g = f[0].uri.fsPath;
        }
        const files = await vscode.window.showOpenDialog({
          canSelectMany: true,
          openLabel: 'Select files',
          filters: {
            'All files': ['*']
          }
        });
        if (files) {
          for (const file of files) {
            if (!this.selectedFiles.includes(file.fsPath) && file.fsPath.startsWith(g)) {
              const pathWithinWorkspace = file.fsPath.replace(g, '').substring(1);
              this.selectedFiles.push(pathWithinWorkspace);
            }
          }
          webviewView.webview.postMessage({ command: 'updateFileList', files: this.selectedFiles });
        }
      } else if (message.command === 'updateFileList') {
        this.selectedFiles = message.files;
        webviewView.webview.postMessage({ command: 'updateFileList', files: this.selectedFiles });
      }
    });

    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId === 'python') {
          const userCode = document.getText();
          const commentWorthyLines = scanForCommentWorthyLines(userCode);
          const uncommentedCode = checkIfLinesAreCommented(userCode, commentWorthyLines);
          const model = 'qwen2.5-coder:7b';
        
          try {
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
          let selectedFiles = [];

          function commentFile() {
            vscode.postMessage({ command: 'commentFile', files: selectedFiles });
          }

          function acceptChanges() {
            vscode.postMessage({ command: 'acceptChanges' });
          }
          function dismissChanges() {
            vscode.postMessage({ command: 'dismissChanges' });
          }

          function addFiles() {
            vscode.postMessage({ command: 'addFiles' });
          }

          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'showAcceptDismissButtons') {
              document.getElementById('accept-dismiss-buttons').style.display = 'flex';
            } else if (message.command === 'hideAcceptDismissButtons') {
              document.getElementById('accept-dismiss-buttons').style.display = 'none';
            } else if (message.command === 'updateFileList') {
              selectedFiles = message.files;
              const fileListContainer = document.getElementById('file-list');
              fileListContainer.innerHTML = '';
              selectedFiles.forEach(file => {
                const listItemP = document.createElement('p');
                listItemP.textContent = file;
                listItemP.style.padding = '0';
                listItemP.className = 'file-list-item-p';
                const removeButton = document.createElement('button');
                removeButton.textContent = 'X';
                removeButton.className = 'li-remove-button';
                removeButton.onclick = () => {
                  selectedFiles = selectedFiles.filter(f => f !== file);
                  vscode.postMessage({ command: 'updateFileList', files: selectedFiles });
                };
                const listItem = document.createElement('li');
                listItem.className = 'file-list-item';
                listItem.appendChild(listItemP);
                listItem.appendChild(removeButton);
                fileListContainer.appendChild(listItem);
              });
            }
          });
        </script>
      </head>
      <body>
        <div id="comment-file-container">
          <h1 class="top-headline">Select Files to comment</h1>
          <button onclick="addFiles()">+ Add files...</button>
          <ul id="file-list" style="padding: 0;"></ul>
          <button onclick="commentFile()">Comment Files</button>
          <div id="accept-dismiss-buttons" style="display: none; flex-direction: row; ">
            <button class="accept-button" style="margin-right: 5px;" onclick="acceptChanges()">Accept</button>
            <button class="dismiss-button" onclick="dismissChanges()">Dismiss</button>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}


async function applyChangesWithHighlights(
  originalCode: string,
  generatedCode: string
): Promise<vscode.TextEditorDecorationType> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found!');
    return vscode.window.createTextEditorDecorationType({});
  }

  const diff = Diff.diffWords(originalCode, generatedCode);
  console.log('Diff:', diff);
  const range: vscode.Range[] = [];
  var lineCounter = 0;
  diff.forEach(part => {
    const lines = part.value.split('\n');
    if (part.added) {
      range.push(new vscode.Range(
        new vscode.Position(lineCounter, 0),
        new vscode.Position(lineCounter + lines.length - 2, 0)
      ));
      lineCounter += lines.length - 1;
    } else {
      console.log(lines.length);
      lineCounter += lines.length - 1;
    }
  });
  
  const decorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType(
    {
      backgroundColor: 'rgba(255, 255, 0, 0.3)',
      isWholeLine: true
    }
  );

  editor.setDecorations(decorationType, range);

  return decorationType;
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
    return previousLine.startsWith('#') || previousLine.startsWith('"""') || previousLine.startsWith("'''");
  });
}

function removePythonWrap(documentedCode: string): string {
  if (documentedCode.startsWith('```python') && documentedCode.endsWith('```')) {
    return documentedCode.replace('```python\n', '').replace('\n```', '');
  } else {
    return documentedCode;
  }
}