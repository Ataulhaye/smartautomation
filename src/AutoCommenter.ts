import * as vscode from 'vscode';
import { LLMService } from './llmService';
import { SessionManager } from './SessionManager';
import jaroWinkler from 'jaro-winkler';

export class AutoCommenter {
    private context: vscode.ExtensionContext;
    private panel: vscode.WebviewPanel | null = null;
    private activePythonFile: string | null = null;
    private llmSer: LLMService;
    private sessionManager: SessionManager;
    private timeout: NodeJS.Timeout | null = null;
    private isQueryInProgress: boolean = false;
    private interval: number = 10000;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.llmSer = new LLMService();
        this.sessionManager = new SessionManager();
        try {
            const config = vscode.workspace.getConfiguration('Parameters');
            this.interval = config.get('interval') || 10000;
        } catch (error) { }
        this.init();
    }

    private init(): void {
        this.context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
                if (document.fileName === this.activePythonFile) {
                    console.log("onDidSaveTextDocument Method called");
                    this.handleFileChange(document.fileName, document);
                }
            })
        );

        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'python') {
                console.log("onDidChangeActiveTextEditor Method called");
                this.handleFileChange(editor.document.fileName, editor.document);
            }
        });

        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel('autoCommenter', 'Auto Commenter', vscode.ViewColumn.Two, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            this.panel.webview.html = this.getDefaultPanelHtml();
        }

        this.panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === 'accept' && this.activePythonFile) {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document.fileName === this.activePythonFile) {
                    const commentedCode = this.sessionManager.getSession(this.activePythonFile!)!.commentedCode;
                    editor.edit(editBuilder => {
                        editBuilder.replace(
                            new vscode.Range(0, 0, editor.document.lineCount, 0),
                            commentedCode
                        );
                    });
                    await editor.document.save();
                    const pageContent = editor.document.getText();
                    this.sessionManager.renewSessionState(this.activePythonFile, pageContent, commentedCode, this.panel);
                    if (this.panel) {
                        this.panel.webview.html = this.getDefaultPanelHtml();
                    }
                }

            } else if (message.command === 'reject') {
                if (this.panel) {
                    this.panel.webview.html = this.getDefaultPanelHtml();
                }
            }
        });

        setInterval(() => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'python') {
                const fileName = editor.document.fileName;
                console.log("setInterval Method called");
                this.handleFileChange(fileName, editor.document);
                console.log("setInterval Method Left");
            }
        }, this.interval);

    }
    private handleFileChange(fileName: string, document: vscode.TextDocument): void {

        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        const hasErrors = diagnostics.some(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error);

        if (hasErrors) {
            return;
        }

        this.sessionManager.updateSessionfileCurrentContent(fileName, document.getText());

        if (!this.isQueryInProgress && this.sessionManager.shouldQueryLLM(fileName)) {
            console.log("should query LLM");
            this.showDocumentingMessage();
            this.processFile(document);
        }
    }

    private async processFile(document: vscode.TextDocument): Promise<void> {
        this.isQueryInProgress = true;
        this.activePythonFile = document.fileName;
        const content = document.getText();
        console.log("*****************************");
        console.log("queryLLMModelAsync called");
        const commentedCode = await this.llmSer.queryLLMModelAsync(content);
        console.log("queryLLMModelAsync Finished");
        console.log("*****************************");
        this.updatePanel(content, commentedCode);
        this.sessionManager.createOrUpdateSession(this.activePythonFile, content, commentedCode, this.panel);
        this.isQueryInProgress = false;
    }

    private updatePanel(originalCode: string, commentedCode: string): void {
        if (this.panel) {
            const diffHtml = this.generateDiffView(originalCode, commentedCode);
            this.panel.webview.html = `
                <html>
                <head>
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
                        .button-container {
                            margin-top: 20px;
                        }
                        .button {
                            padding: 10px 20px;
                            margin-right: 10px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                        }
                        .accept-button {
                            background-color: #4CAF50; /* Green */
                            color: white;
                        }
                        .accept-button:hover {
                            background-color: #45a049; /* Darker green */
                        }
                        .reject-button {
                            background-color: #f44336; /* Red */
                            color: white;
                        }
                        .reject-button:hover {
                            background-color: #e53935; /* Darker red */
                        }
                            
                    </style>
                </head>
                <body>
                    <h3>Changes</h3>
                    ${diffHtml}
                    <button class="button accept-button" onclick="acceptChanges()">Accept</button>
                    <button class="button reject-button" onclick="rejectChanges()">Reject</button>
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

        if (commentedLines.length > originalLines.length) {
            for (let i = originalLines.length; i < commentedLines.length; i++) {
                originalLines.push('');
            }
        }

        let htmlOrig = '<pre style="margin: 0; padding: 0;">'; // Use <pre> for original code
        let htmlChanges = '<pre style="margin: 0; padding: 0;">'; // Use <pre> for changes
        let searchIndex = 0;
        let originalLineKept = false;
        let originalLineModified = false;
        let originalLine = "";
        let modifiedLine = "";

        for (let i = 0; i < commentedLines.length; i++) {
            let line = commentedLines[i];
            let lineTrimed = line.trim();

            if (originalLines.length > searchIndex) {

                for (let j = searchIndex; j < originalLines.length; j++) {
                    originalLine = originalLines[j];
                    let originalLineTrimed = originalLines[j].trim();

                    if (this.isEmptyString(lineTrimed)) {
                        ({ originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLineModified, modifiedLine, originalLines, searchIndex, originalLineKept, originalLine));
                        ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                    }
                    else if (this.isEmptyString(originalLineTrimed)) {
                        ({ j, originalLineTrimed } = this.findNextNonEmptyLine(searchIndex, originalLines, originalLineTrimed));
                        searchIndex = j;
                        ({ originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLineModified, modifiedLine, originalLines, searchIndex, originalLineKept, originalLine));
                        ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                    }
                    else if (this.isDocStringStart(lineTrimed)) {
                        let origDocString  = [];
                        let llmDocString  = this.extractDocString(line, i, commentedLines, lineTrimed);

                        if (this.isDocStringStart(originalLineTrimed)) {
                           origDocString = this.extractDocString(originalLine, j, originalLines, originalLineTrimed);
                        }

                        if (origDocString.length === 0) {
                            for (let m = 0; m < llmDocString.length; m++) {
                                line = commentedLines[i];
                                ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                                i++;
                            }
                            i--;
                        }
                        else {
                            for (let m = 0; m < llmDocString.length; m++) {
                                line = commentedLines[i];
                                lineTrimed = line.trim();
                                originalLine = originalLines[j];
                                originalLineTrimed = originalLines[j].trim();
                                if (m > origDocString.length) {
                                    console.log("neither original nor modified string");
                                }
                                else {
                                    ({ originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLineModified, modifiedLine, originalLines, j, originalLineKept, originalLine, false));
                                }

                                ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                                i++;

                                if (origDocString.length !== llmDocString.length) {
                                    if (m < origDocString.length) {
                                        j++;
                                    }
                                }
                                else {
                                    j++;
                                }

                            }
                            searchIndex = j;
                            i--;
                        }

                    }
                    else if (lineTrimed.startsWith("#")) {

                        let origHashtagComments = this.findNextNonHashtagLine(j, originalLines);
                        let llmHashtagComments = this.findNextNonHashtagLine(i, commentedLines);

  
                        if (llmHashtagComments.length === 0 && origHashtagComments.length > 0) {
                            for (let m = 0; m < origHashtagComments.length; m++) {
                                line = "";
                                originalLineModified = true;
                                modifiedLine = originalLines[j];
                                ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                                j++;
                            }
                            searchIndex = j;
                        }
                        else if (origHashtagComments.length === 0 && llmHashtagComments.length > 0) {
                            for (let m = 0; m < llmHashtagComments.length; m++) {
                                line = commentedLines[i];
                                originalLineModified = true;
                                modifiedLine = "";
                                ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                                i++;
                            }
                            i--;
                        }
                        else if(llmHashtagComments.length === origHashtagComments.length) {
                                //do strict comparison line by line and render, increment both i and j     
                            for (let m = 0; m < llmHashtagComments.length; m++) {
                                line = commentedLines[i];
                                lineTrimed = line.trim();
                                originalLine = originalLines[j];
                                originalLineTrimed = originalLine.trim();
                                ({ originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLineModified, modifiedLine, originalLines, j, originalLineKept, originalLine, false));
                                ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                                i++;
                                j++;
                            }
                            i--;
                            searchIndex = j;                
                        }                      
                        else if (llmHashtagComments.length > origHashtagComments.length) {    
                            for (let m = 0; m < llmHashtagComments.length; m++) {
                                line = commentedLines[i];
                                lineTrimed = line.trim();
                                originalLine = originalLines[j];
                                originalLineTrimed = originalLine.trim();
                                if (m < origHashtagComments.length) {
                                    ({ originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLineModified, modifiedLine, originalLines, j, originalLineKept, originalLine, false));
                                }
                                else {
                                    modifiedLine = "";
                                }                               
                                ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                                i++;
                                if (m < origHashtagComments.length) {
                                    j++;
                                }
                            }
                            i--;
                            searchIndex = j;
                        }
                        else if (origHashtagComments.length > llmHashtagComments.length) {    
                            for (let m = 0; m < origHashtagComments.length; m++) {
                                line = commentedLines[i];
                                lineTrimed = line.trim();
                                originalLine = originalLines[j];
                                originalLineTrimed = originalLine.trim();
                                if (m < llmHashtagComments.length) {
                                    ({ originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLineModified, modifiedLine, originalLines, j, originalLineKept, originalLine, false));
                                }
                                else {
                                    line = "";
                                }
                                ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                                j++;
                                if (m < llmHashtagComments.length) {
                                    i++;
                                }
                            }
                            i--;
                            searchIndex = j;
                        }
                        else{
                            console.log("This must not happen");
                        }
                    }
                    else {
                        ({ originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLineModified, modifiedLine, originalLines, searchIndex, originalLineKept, originalLine));
                        ({ originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                    }
                    break;           
                }
            }
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

    private findNextNonHashtagLine(index: number, linesCollection: string[]) {
        let o = index;
        let hashtagComments = [];
        //find next line not starting with #
        while (o < linesCollection.length) {
            let originalLine = linesCollection[o];
            let originalLineTrimed = linesCollection[o].trim();
            if (!originalLineTrimed.startsWith("#") && !this.isEmptyString(originalLineTrimed)) {
                break;
            }
            hashtagComments.push(originalLine);
            o++;
        }
        return hashtagComments;
    }

    private renderLineComparison(originalLineKept: boolean, htmlOrig: string, i: number, originalLine: string, htmlChanges: string, line: string, originalLineModified: boolean, modifiedLine: string) {
        if (originalLineKept) {
            htmlOrig += `<div class="code-block"><span class="line-number">${i + 1}:</span> ${originalLine.trim()}</div>`;
            htmlChanges += `<div class="code-block"><span class="line-number">${i + 1}:</span> ${line}</div>`;
            originalLineKept = false;
            originalLine = "";
        } else if (originalLineModified) {
            htmlOrig += `<div class="code-block removed"><span class="line-number">${i + 1}:</span> - ${modifiedLine}</div>`; //.trimStart() modifiedLine.replace(/\r/g, '')
            htmlChanges += `<div class="code-block added"><span class="line-number">${i + 1}:</span> + ${line}</div>`;
            originalLineModified = false;
            modifiedLine = "";
        } else {
            htmlOrig += `<div class="code-block">&nbsp;</div>`;
            htmlChanges += `<div class="code-block added"><span class="line-number">${i + 1}:</span> + ${line}</div>`;
        }
        return { originalLineKept, htmlOrig, originalLine, htmlChanges, originalLineModified, modifiedLine };
    }

    private extractDocString(line: string, i: number, commentedLines: string[], lineTrimed: string) {
        let docString = [];

        docString.push(line);
        let k = i;
        k++;
        while (k < commentedLines.length) {
            line = commentedLines[k];
            lineTrimed = line.trim();
            if (this.isDocStringStart(lineTrimed)) {
                docString.push(line);
                break;
            }
            docString.push(line);
            k++;
        }
        k = k + 1;
        return docString;
    }

    private isDocStringStart(lineTrimed: string) {
        return lineTrimed.startsWith('"""') || lineTrimed.startsWith("'''");
    }

    private findNextNonEmptyLine(searchIndex: number, originalLines: string[], originalLineTrimed: string) {
        let j = searchIndex;
        while (j < originalLines.length) {
            originalLineTrimed = originalLines[j].trim();
            if (!this.isEmptyString(originalLineTrimed)) {
                break;
            }
            j++;
        }
        return { j, originalLineTrimed };
    }

    private isEmptyString(line: string) {
        return line === '' || line === '""';
    }

    private processLineComparison(lineTrimed: string, originalLineTrimed: string, originalLineModified: boolean, modifiedLine: string, linesCollection: string[], searchIndex: number, originalLineKept: boolean, originalLine: string, increment: boolean = true) {
        if (lineTrimed === originalLineTrimed || lineTrimed.toLowerCase() === originalLineTrimed.toLowerCase()) {
            originalLineKept = true;
            originalLine = linesCollection[searchIndex];
            if (increment) {
                searchIndex++;
            }
        }
        else if (lineTrimed.includes(originalLineTrimed) || lineTrimed.toLowerCase().includes(originalLineTrimed.toLowerCase()) || this.deepCheck(lineTrimed, originalLineTrimed)) {
            originalLineModified = true;
            modifiedLine = linesCollection[searchIndex];
            if (increment) {
                searchIndex++;
            }
        }
        /**
        else{
            if (originalLineTrimed.startsWith("#")) {
                if (increment) {
                    searchIndex++;
                }
            }
        }
         */

        return { originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine };
    }

    private deepCheck(lineTrimed: string, originalLineTrimed: string, similarityThreshold: number = 0.6): boolean {
        let result = false;
        const similarity = jaroWinkler(originalLineTrimed, lineTrimed);
        if (similarity >= similarityThreshold) {
            result = true;
            console.log("Similarity: " + similarity);
        }

        return result;
    }


    private getDefaultPanelHtml(): string {
        return `
        <html>
        <head>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    width: 100%;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                }
                .welcome-container {
                    text-align: center;
                }
                .welcome-title {
                    font-size: 24px;
                    margin-bottom: 10px;
                }
                .welcome-message {
                    font-size: 16px;
                }
            </style>
        </head>
        <body>
            <div class="welcome-container">
                <div class="welcome-title">Welcome to Smart Automation</div>
                <div class="welcome-message">Improve your code readability with AI-powered code comments.</div>
            </div>
        </body>
        </html>`;
    }

    private showDocumentingMessage(): void {
        if (this.panel) {
            this.panel.webview.html = `
                <html>
                <head>
                    <style>
                        body {
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100%;
                            width: 100%;
                            background-color: var(--vscode-editor-background);
                            color: var(--vscode-editor-foreground);
                            font-family: var(--vscode-editor-font-family);
                            font-size: var(--vscode-editor-font-size);
                        }
                        .wait-title {
                            font-size: 24px;
                            margin-bottom: 10px;
                        }
                        .documenting-container {
                            text-align: center;
                        }
                        .documenting-message {
                            font-size: 20px;
                        }
                        .dots {
                            display: inline-block;
                            width: 1em;
                            text-align: left;
                        }
                    </style>
                </head>
                    <body>
                        <div class="documenting-container">
                            <div class="wait-title">SMART AUTOMATION</div>
                             <div class="documenting-message">Documenting<span class="dots" id="dots"></span></div>
                        </div>
                        <script>
                            let dots = 0;
                            setInterval(() => {
                                const dotsElement = document.getElementById('dots');
                                if (dotsElement) {
                                    dotsElement.innerText = '.'.repeat(dots);
                                    dots = (dots % 3) + 1;
                                }
                            }, 500);
                        </script>
                    </body>
                </html>`;
        }
    }

    public deactivate(): void {
        if (this.timeout) { clearInterval(this.timeout); }
        this.sessionManager = new SessionManager(); // Reset the session manager
    }
}

