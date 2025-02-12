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
        const originalLinesMap = new Map<string, number>();
        originalLines.forEach((line, index) => {
            originalLinesMap.set(line.trim(), index);
        });
        const commentedLinesMap = new Map<string, number>();
        commentedLines.forEach((line, index) => {
            commentedLinesMap.set(line.trim(), index);
        });

        let diffHtml = '<div style="display: flex;">';
        diffHtml += '<div style="width: 50%; padding-right: 10px;">';
        diffHtml += '<h4>Original</h4><pre style="background:#ffdddd; padding:10px;">';

        for (let i = 0; i < originalLines.length; i++) {
            const line = originalLines[i];
            if (commentedLinesMap.has(line.trim())) {
                const oldIndex = originalLinesMap.get(line.trim());
                const newIndex = commentedLinesMap.get(line.trim());
                let whiteSpaces = (newIndex ?? 0) - (oldIndex ?? 0);
                for (let j = 1; j < whiteSpaces; j++) {
                    diffHtml += `<span>&nbsp;</span>\n`;
                }
                diffHtml += `<span>${i + 1}: ${line}</span>\n`;
            } else {
                diffHtml += `<span style="color:red;">${i + 1}: - ${line}</span>\n`;
            }
        }

        diffHtml += '</pre></div>';

        diffHtml += '<div style="width: 50%; padding-left: 10px;">';
        diffHtml += '<h4>Changes</h4><pre style="background:#ddffdd; padding:10px;">';

        commentedLines.forEach((line, index) => {
            if (originalLinesMap.has(line.trim())) {

                diffHtml += `<span>${index + 1}: ${line}</span>\n`;
            }
            else {
                diffHtml += `<span style="color:green;">${index + 1}: + ${line}</span>\n`;
            }
        });

        diffHtml += '</pre></div></div>';

        return diffHtml;
    }

    public deactivate(): void {
        if (this.timeout) { clearInterval(this.timeout); }
    }
}
