import * as vscode from 'vscode';
import { LLMService } from './llmService';
import { SessionManager } from './SessionManager';

export class AutoCommenter {
    private context: vscode.ExtensionContext;
    private panel: vscode.WebviewPanel | null = null;
    private activePythonFile: string | null = null;
    private llmSer: LLMService;
    private sessionManager: SessionManager;
    private timeout: NodeJS.Timeout | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.llmSer = new LLMService();
        this.sessionManager = new SessionManager();
        this.init();
    }

    private init(): void {
        this.context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
                if (document.fileName === this.activePythonFile) {
                    this.processFile(document);
                }
            })
        );

        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'python') {
                this.processFile(editor.document);
            }
        });

        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel('autoCommenter', 'Auto Commenter', vscode.ViewColumn.Two, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
        }

        this.panel.webview.onDidReceiveMessage((message: any) => {
            if (message.command === 'accept' && this.activePythonFile) {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document.fileName === this.activePythonFile) {
                    editor.edit(editBuilder => {
                        editBuilder.replace(
                            new vscode.Range(0, 0, editor.document.lineCount, 0),
                            this.sessionManager.getSession(this.activePythonFile!).commentedCode // Use the raw commented code
                        );
                    });
                }
            }
        });

        setInterval(() => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'python') {
                const fileName = editor.document.fileName;
                const session = this.sessionManager.getSession(fileName);
                if (session ) {
                    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
                    const hasErrors = diagnostics.some(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error);

                    if (hasErrors) {
                        return;
                    }
                    this.sessionManager.updateSessionfileCurrentContent(fileName, editor.document.getText());
                    if(this.sessionManager.shouldQueryLLM(fileName)) {
                    this.processFile(editor.document);
                }
            }
            }
        }, 10000);
    }

    private async processFile(document: vscode.TextDocument): Promise<void> {
        this.activePythonFile = document.fileName;
        const content = document.getText();
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        const hasErrors = diagnostics.some(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error);

        if (hasErrors) {
            return;
        }
        const session = this.sessionManager.getSession(this.activePythonFile);

        if (!session || this.sessionManager.shouldQueryLLM(this.activePythonFile)) {
            const commentedCode = await this.llmSer.queryLLMModelAsync(content);           
            this.updatePanel(content, commentedCode);
            this.sessionManager.createOrUpdateSession(this.activePythonFile, content, commentedCode, this.panel);
        }
    }

    private updatePanel(originalCode: string, commentedCode: string): void {
        if (this.panel) {
            const diffHtml = this.generateDiffView(originalCode, commentedCode);
            const styleUri = this.panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles', 'styles.css')
            );
            this.panel.webview.html = `
                <html>
                <head>
                    <link rel="stylesheet" type="text/css" href="${styleUri}">
                    <style>
                        body {
                            color: var(--vscode-editor-foreground);
                            background-color: var(--vscode-editor-background);
                            margin: 0;
                            padding: 0;
                        }
                        .code-block {
                            display: flex;
                            align-items: center;
                            width: 100%; /* Ensure full width */
                            margin: 0;
                            padding: 2px 0; /* Add small vertical padding */
                            font-family: var(--vscode-editor-font-family);
                            font-size: var(--vscode-editor-font-size);
                            line-height: 1.2; /* Compact line height */
                        }
                        .added {
                            background-color: var(--vscode-diffEditor-insertedTextBackground);
                            width: 100%; /* Ensure full width */
                            padding-right: 20px; /* Add right padding for readability */
                        }
                        .removed {
                            background-color: var(--vscode-diffEditor-removedTextBackground);
                            width: 100%; /* Ensure full width */
                            padding-right: 20px; /* Add right padding for readability */
                        }
                        .line-number {
                            color: var(--vscode-editorLineNumber-foreground);
                            margin-right: 10px; /* Spacing between line number and code */
                            min-width: 30px; /* Ensure consistent width for line numbers */
                        }
                        h4 {
                            margin-top: 0;
                            margin-bottom: 10px;
                        }
                    </style>
                </head>
                <body>
                    <h3>Changes</h3>
                    ${diffHtml}
                    <button onclick="acceptChanges()">Accept</button>
                    <button onclick="rejectChanges()">Reject</button>
                    <script>
                        const vscode = acquireVsCodeApi();
                        function acceptChanges() { vscode.postMessage({ command: 'accept' }); }
                        function rejectChanges() { vscode.postMessage({ command: 'reject' }); }
                    </script>
                </body>
                </html>`;
        }
    }

    private generateDiffView(originalCode: string, commentedCode: string): string {
        const originalLines = originalCode.split('\n');
        const commentedLines = commentedCode.split('\n');

        const isEmptyString = (line: string): boolean => {
            return line === '' || line === '""';
        };

        let htmlOrig = '<pre style="margin: 0; padding: 0;">'; // Use <pre> for original code
        let htmlChanges = '<pre style="margin: 0; padding: 0;">'; // Use <pre> for changes
        let searchIndex = 0;
        let lineExists = false;
        let isModified = false;
        let originalLine = "";
        let modifiedline = "";

        for (let i = 0; i < commentedLines.length; i++) {
            const line = commentedLines[i];
            let lineTrimed = line.trim();

            if (originalLines.length >= searchIndex) {
                for (let j = searchIndex; j < originalLines.length; j++) {
                    let originalLineTrimed = originalLines[j].trim();

                    if (lineTrimed.startsWith('"""')) {
                        let k = searchIndex;
                        while (k < originalLines.length) {
                            if (lineTrimed.includes(originalLines[k])) {
                                isModified = true;
                                searchIndex = k;
                                if (lineTrimed === originalLineTrimed) {
                                    lineExists = true;
                                    originalLine = originalLines[k];
                                }
                                break;
                            }
                            k++;
                            if (!isEmptyString(originalLines[k].trim())) {
                                break;
                            }
                        }
                    } else if (lineTrimed.includes(originalLineTrimed)) {
                        isModified = true;
                        searchIndex = j;
                        modifiedline = originalLines[j];
                        if (lineTrimed === originalLineTrimed) {
                            lineExists = true;
                            originalLine = originalLines[j];
                        }
                        searchIndex++;
                    }
                    break;
                }
            }

            if (lineExists) {
                htmlOrig += `<div class="code-block"><span class="line-number">${i + 1}:</span> ${originalLine.trim()}</div>`;
                htmlChanges += `<div class="code-block"><span class="line-number">${i + 1}:</span> ${line}</div>`;
            } else if (isModified) {
                htmlOrig += `<div class="code-block removed"><span class="line-number">${i + 1}:</span> - ${modifiedline.replace(/\r/g, '')}</div>`;//.trimStart()
                htmlChanges += `<div class="code-block added"><span class="line-number">${i + 1}:</span> + ${line}</div>`;
            } else {
                htmlOrig += `<div class="code-block">&nbsp;</div>`;
                htmlChanges += `<div class="code-block added"><span class="line-number">${i + 1}:</span> + ${line}</div>`;
            }

            lineExists = false;
            isModified = false;
            originalLine = "";
            modifiedline = "";
        }

        htmlOrig += '</pre>';
        htmlChanges += '</pre>';

        let diffHtml = '<div style="display: flex; gap: 10px;">'; // Add gap between columns
        diffHtml += '<div style="flex: 1; padding-right: 20px;">'; // Dynamic width with right padding
        diffHtml += '<h4>Original</h4>';
        diffHtml += htmlOrig;
        diffHtml += '</div>';

        diffHtml += '<div style="flex: 1; padding-right: 20px;">'; // Dynamic width with right padding
        diffHtml += '<h4>Changes</h4>';
        diffHtml += htmlChanges;
        diffHtml += '</div></div>';

        return diffHtml;
    }

    private escapeHtml(text: string): string {
        return text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    public deactivate(): void {
        if (this.timeout) { clearInterval(this.timeout); }
        this.sessionManager = new SessionManager(); // Reset the session manager
    }
}
