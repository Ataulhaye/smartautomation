import * as vscode from 'vscode';
import { LLMService } from './llmService';

export class AutoCommenter {
    private context: vscode.ExtensionContext;
    private panel: vscode.WebviewPanel | null = null;
    private timeout: NodeJS.Timeout | null = null;
    private activePythonFile: string | null = null;
    private llmSer: LLMService;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.llmSer = new LLMService();
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
                        const match = this.panel?.webview.html.match(/<pre.*?>([\s\S]*?)<\/pre>/g);
                        if (match && match[1]) {
                            editBuilder.replace(
                                new vscode.Range(0, 0, editor.document.lineCount, 0),
                                match[1].replace(/<.*?>/g, '')
                            );
                        }
                    });
                }
            }
        });

        this.timeout = setInterval(() => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'python') {
                this.processFile(editor.document);
            }
        }, 10000);
    }

    private async processFile(document: vscode.TextDocument): Promise<void> {
        if (document.languageId !== 'python') { return; };
        this.activePythonFile = document.fileName;
        this.panel?.webview.postMessage({ command: 'loading' });
        const commentedCode = await this.llmSer.queryLLMModelAsync(document.getText());
        this.updatePanel(document.getText(), commentedCode);
    }

    private updatePanel(originalCode: string, commentedCode: string): void {
        if (this.panel) {
            const diffHtml = this.generateDiffView(originalCode, commentedCode);
            this.panel.webview.html = `
                <html>
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
        //const maxLength = Math.max(originalLines.length, commentedLines.length);

        const isEmptyString = (line: string): boolean => {
            return line === '' || line === '""';
        };

        let htmlOrig = '';
        let htmlChanges = '';
        let searchIndex = 0;
        let lineExists = false;
        let isModified = false;
        let originalLine = "";

        for (let i = 0; i < commentedLines.length; i++) {
            const line = commentedLines[i];
            console.log("################################################");
            console.log("Line:", line);
            let lineTrimed = line.trim();
            if (i === 15) {
                console.log("Line:", line);
            }

            if (originalLines.length >= searchIndex) {
                for (let j = searchIndex; j < originalLines.length; j++) {
                    let originalLineTrimed = originalLines[j].trim();

                    console.log("OriginalLine:", originalLines[j]);
                    //console.log("OriginalLineTrimmed:", originalLineTrimed);
                    //checking python doc string
                    if (lineTrimed.startsWith('"""')) {
                        //check if original line is empty string
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
                    }
                    else if (lineTrimed.includes(originalLineTrimed)) {
                        isModified = true;
                        searchIndex = j;
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
                htmlOrig += `<span>${i + 1}: ${originalLine.trim()}</span>\n`;
                htmlChanges += `<span>${i + 1}: ${line}</span>\n`;
            }
            else if (isModified) {
                htmlOrig += `<span style="color:red;">${i + 1}: - ${originalLine}</span>\n`;
                htmlChanges += `<span style="color:green;">${i + 1}: + ${line}</span>\n`;
            }
            else {
                htmlOrig += `<span>&nbsp;</span>\n`;
                htmlChanges += `<span style="color:green;">${i + 1}: + ${line}</span>\n`;
            }

            lineExists = false;
            isModified = false;
            originalLine = "";

        }
        let diffHtml = '<div style="display: flex;">';
        diffHtml += '<div style="width: 50%; padding-right: 10px;">';
        diffHtml += '<h4>Original</h4><pre style="background:#ffdddd; padding:10px;">';

        diffHtml += htmlOrig;

        diffHtml += '</pre></div>';

        diffHtml += '<div style="width: 50%; padding-left: 10px;">';
        diffHtml += '<h4>Changes</h4><pre style="background:#ddffdd; padding:10px;">';

        diffHtml += htmlChanges;

        diffHtml += '</pre></div></div>';

        return diffHtml;
    }

    public deactivate(): void {
        if (this.timeout) { clearInterval(this.timeout); }
    }
}
