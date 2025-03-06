import * as vscode from 'vscode';
import { LLMService } from './llmService';
import { SessionManager } from './SessionManager';
import jaroWinkler from 'jaro-winkler';
import { ValidationService } from './ValidationService';

export class AutoCommenter {
    private context: vscode.ExtensionContext;
    private panel: vscode.WebviewPanel | null = null;
    private activePythonFile: string | null = null;
    private llmSer: LLMService;
    private sessionManager: SessionManager;
    private timeout: NodeJS.Timeout | null = null;
    private isQueryInProgress: boolean = false;
    private interval: number = 10000;
    private lastActiveEditor: vscode.TextEditor | undefined;
    private validationSer: ValidationService;
    private lLMResponseValidation: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.llmSer = new LLMService();
        this.validationSer = new ValidationService();
        this.sessionManager = new SessionManager();
        try {
            const config = vscode.workspace.getConfiguration('Parameters');
            this.interval = config.get('interval') || 10000;
            this.lLMResponseValidation = config.get('LLMResponseValidation') || false;
        } catch (error) { }
        this.init();
    }

    private init(): void {
        this.context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
                if (document.fileName === this.activePythonFile) {
                    //console.log("onDidSaveTextDocument Method called");
                    this.handleFileChange(document.fileName, document);
                }
            })
        );

        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'python') {
                this.lastActiveEditor = editor;
                //console.log("onDidChangeActiveTextEditor Method called");
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
                const editor = vscode.window.activeTextEditor || this.lastActiveEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor detected. Please focus on a python file editor.');
                    return;
                }
                if (editor && editor.document.fileName === this.activePythonFile) {
                    this.isQueryInProgress = true;
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
                    this.isQueryInProgress = false;
                }

            } else if (message.command === 'reject') {
                if (this.panel) {
                    this.panel.webview.html = this.getDefaultPanelHtml();
                }
            } else if (message.command === 'forcequery') {
                const editor = vscode.window.activeTextEditor || this.lastActiveEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor detected. Please focus on a python file editor.');
                    return;
                }
                if (editor && editor.document.languageId === 'python') {
                    this.handleFileChange(editor.document.fileName, editor.document, true);
                }
            }
        });

        setInterval(() => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'python') {
                const fileName = editor.document.fileName;
                //console.log("setInterval Method called");
                this.handleFileChange(fileName, editor.document);
                //console.log("setInterval Method Left");
            }
        }, this.interval);

    }

    private handleFileChange(fileName: string, document: vscode.TextDocument, forceQuery: boolean = false): void {
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        const hasErrors = diagnostics.some(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error);

        if (hasErrors) {
            vscode.window.showInformationMessage('The file has errors. Please fix them before generating comments.');
            return;
        }

        if (!this.isQueryInProgress) {
            this.sessionManager.updateSessionfileCurrentContent(fileName, document.getText());
        }

        if (!this.isQueryInProgress && (forceQuery || this.sessionManager.shouldQueryLLM(fileName))) {
            //console.log("should query LLM");
            this.showDocumentingMessage();
            this.processFile(document);
        }
    }

    private async processFile(document: vscode.TextDocument): Promise<void> {
        try {
            this.isQueryInProgress = true;
            this.activePythonFile = document.fileName;
            const content = document.getText();

            if (content.trim() === '') {
                this.isQueryInProgress = false;
                if (this.panel) {
                    this.panel.webview.html = this.getDefaultPanelHtml();
                }
                return;
            }
            //console.log("*****************************");
            //console.log("queryLLMModelAsync called");
            const commentedCode = await this.llmSer.queryLLMModelAsync(content);

            if (this.lLMResponseValidation) {
                // console.log("-----Validating LLM response---");
                // console.log("queryLLMModelAsync Finished");
                // console.log("*****************************");
                const isValid = await this.validationSer.checkPythonSyntaxAsync(commentedCode);
                if (isValid) {
                    this.updatePanel(content, commentedCode);
                    this.sessionManager.createOrUpdateSession(this.activePythonFile, content, commentedCode, this.panel);
                    this.isQueryInProgress = false;
                }
                else {
                    vscode.window.showInformationMessage('The generated comments by LLM has errors. Please try again.');
                    console.log("Syntax check failed");
                    this.isQueryInProgress = false;
                    if (this.panel) {
                        this.panel.webview.html = this.getDefaultPanelHtml();
                    }
                }
                //console.log("-----Validating LLM response Finished-----");
            }
            else {
                //console.log("queryLLMModelAsync Finished");
                //console.log("*****************************");
                this.updatePanel(content, commentedCode);
                this.sessionManager.createOrUpdateSession(this.activePythonFile, content, commentedCode, this.panel);
                this.isQueryInProgress = false;
            }

        } catch (error) {
            vscode.window.showErrorMessage('An error occurred while generating comments. Please try again.');
            this.isQueryInProgress = false;
            this.getDefaultPanelHtml();
        }


    }

    private updatePanel(originalCode: string, commentedCode: string): void {
        if (this.panel) {
            const codeComparisonHtml = this.generateCodeComparisonHTMLView(originalCode, commentedCode);
            const fileName = this.activePythonFile!.split('\\').pop();
            this.panel.webview.html = this.createHtmlPanel(fileName, codeComparisonHtml);
        }
    }

    private createHtmlPanel(fileName: string | undefined, codeComparisonHtml: string): string {
        return `
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
                            margin: 10px 10px 10px 0;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: background-color 0.3s, box-shadow 0.3s;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                            
                        } 
                        .accept-button {
                            background-color: #4CAF50; /* Green */
                            color: white;
                            margin-left: 20px;
                        }
                        .accept-button:hover {
                            background-color: #45a049; /* Darker green */
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); /* Larger shadow on hover */
                        }
                        .reject-button {
                            background-color: #888888; /* Grey */
                            color: white;
                        }
                        .reject-button:hover {
                            background-color: #a9a9a9; /* Lighter grey */
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); /* Larger shadow on hover */
                        }
                    </style>
                </head>
                <body>
                    <h3>Proposed Documentation Revisions for ${fileName}</h3>
                    ${codeComparisonHtml}
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

    private generateCodeComparisonHTMLView(originalCode: string, commentedCode: string): string {
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

        for (let i = 0; i < commentedLines.length; i++) {

            let line = commentedLines[i];
            let lineTrimed = line.trim();

            if (originalLines.length > searchIndex) {
                for (let j = searchIndex; j < originalLines.length; j++) {

                    let originalLine = originalLines[j];
                    let originalLineTrimed = originalLine.trim();
                    let modifiedLine = "";
                    let originalLineKept = false;
                    let originalLineModified = false;

                    if (this.isEmptyString(originalLineTrimed) && !this.isEmptyString(lineTrimed)) {
                        //lineTrimmed is empty and originalLineTrimmed is not empty
                        ({ j, originalLineTrimed } = this.findNextNonEmptyLine(j, originalLines, originalLineTrimed));
                        ({ originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLines, j));
                        ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                    }
                    else if (this.isDocStringStart(lineTrimed) || this.isDocStringStart(originalLineTrimed)) {
                        ({ i, searchIndex, htmlOrig, htmlChanges } = this.handleDocStringDifferences(i, commentedLines, originalLineTrimed, j, originalLines, line, htmlOrig, htmlChanges, originalLineKept, originalLine, originalLineModified, modifiedLine, lineTrimed, searchIndex));
                    }
                    else if (lineTrimed.startsWith("#") || originalLineTrimed.startsWith("#")) {
                        ({ i, searchIndex, htmlOrig, htmlChanges } = this.handleHashtagComments(j, originalLines, i, commentedLines, line, originalLineModified, modifiedLine, htmlOrig, htmlChanges, originalLineKept, originalLine, searchIndex, lineTrimed, originalLineTrimed));
                    }
                    else {
                        ({ originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLines, j));
                        ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
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

    private handleHashtagComments(j: number, originalLines: string[], i: number, commentedLines: string[], line: string, originalLineModified: boolean, modifiedLine: string, htmlOrig: string, htmlChanges: string, originalLineKept: boolean, originalLine: string, searchIndex: number, lineTrimed: string, originalLineTrimed: string) {
        let origHashtagComments = this.findHashtagCommentsLength(j, originalLines);
        let llmHashtagComments = this.findHashtagCommentsLength(i, commentedLines);

        if (llmHashtagComments === 0 && origHashtagComments > 0) {
            for (let m = 0; m < origHashtagComments; m++) {
                line = "";
                originalLineModified = true;
                modifiedLine = originalLines[j];
                originalLineKept = false;//to make sure the original line is not added to the html
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                j++;
            }
            searchIndex = j;
            i--;
        }
        else if (origHashtagComments === 0 && llmHashtagComments > 0) {
            for (let m = 0; m < llmHashtagComments; m++) {
                line = commentedLines[i];// this will hit the 3rd render case
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                i++;
            }
            i--;
        }
        else if (llmHashtagComments === origHashtagComments) {
            //do strict comparison line by line and render, increment both i and j     
            for (let m = 0; m < llmHashtagComments; m++) {
                line = commentedLines[i];
                lineTrimed = line.trim();
                originalLine = originalLines[j];
                originalLineTrimed = originalLine.trim();
                ({ originalLineModified, modifiedLine, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLines, j, false, true));
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                i++;
                j++;
            }
            i--;
            searchIndex = j;
        }
        else if (llmHashtagComments > origHashtagComments) {
            for (let m = 0; m < llmHashtagComments; m++) {
                line = commentedLines[i];
                lineTrimed = line.trim();
                originalLine = originalLines[j];
                originalLineTrimed = originalLine.trim();
                if (m < origHashtagComments) {
                    ({ originalLineModified, modifiedLine, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLines, j, false, true));
                }
                else {
                    //hit the 3rd case
                    originalLineModified = false;
                    originalLineKept = false;//to make sure the original line is not added to the html
                }
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                i++;
                if (m < origHashtagComments) {
                    j++;
                }
            }
            i--;
            searchIndex = j;
        }
        else if (origHashtagComments > llmHashtagComments) {
            for (let m = 0; m < origHashtagComments; m++) {
                line = commentedLines[i];
                lineTrimed = line.trim();
                originalLine = originalLines[j];
                originalLineTrimed = originalLine.trim();
                if (m < llmHashtagComments) {
                    ({ originalLineModified, modifiedLine, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLines, j, false, true));
                }
                else {
                    line = "";
                    originalLineModified = true;
                    modifiedLine = originalLines[j];
                    originalLineKept = false;//to make sure the original line is not added to the html
                }
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                j++;
                if (m < llmHashtagComments) {
                    i++;
                }
            }
            i--;
            searchIndex = j;
        }
        else {
            console.log("This must not happen");
        }
        return { i, searchIndex, htmlOrig, htmlChanges };
    }

    private handleDocStringDifferences(i: number, commentedLines: string[], originalLineTrimed: string, j: number, originalLines: string[], line: string, htmlOrig: string, htmlChanges: string, originalLineKept: boolean, originalLine: string, originalLineModified: boolean, modifiedLine: string, lineTrimed: string, searchIndex: number) {
        let origDocStringLength = 0;
        let llmDocStringLength = this.extractDocString(i, commentedLines);

        if (this.isDocStringStart(originalLineTrimed)) {
            origDocStringLength = this.extractDocString(j, originalLines);
        }

        if (origDocStringLength === 0) {
            for (let m = 0; m < llmDocStringLength; m++) {
                line = commentedLines[i];
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                i++;
            }
            i--;
        }
        else if (llmDocStringLength === 0) {
            for (let m = 0; m < origDocStringLength; m++) {
                modifiedLine = originalLines[j];
                originalLineModified = true;
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                j++;
            }
            searchIndex = j;
            i--;
        }
        else if (llmDocStringLength === origDocStringLength) {
            for (let m = 0; m < llmDocStringLength; m++) {
                line = commentedLines[i];
                lineTrimed = line.trim();
                originalLine = originalLines[j];
                originalLineTrimed = originalLine.trim();
                ({ originalLineModified, modifiedLine, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLines, j, false, true));
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                i++;
                j++;
            }
            i--;
            searchIndex = j;
        }
        else if (llmDocStringLength > origDocStringLength) {
            for (let m = 0; m < llmDocStringLength; m++) {
                line = commentedLines[i];
                lineTrimed = line.trim();
                originalLine = originalLines[j];
                originalLineTrimed = originalLine.trim();
                if (m < origDocStringLength) {
                    ({ originalLineModified, modifiedLine, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLines, j, false, true));
                }
                else {
                    modifiedLine = "";
                }
                //special case for docstring
                if (m === llmDocStringLength - 1) {
                    originalLineKept = true;
                    originalLine = '"""';
                }
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                i++;
                if (m < origDocStringLength) {
                    j++;
                }
            }
            i--;
            searchIndex = j;
        }
        else if (origDocStringLength > llmDocStringLength) {
            for (let m = 0; m < origDocStringLength; m++) {
                line = commentedLines[i];
                lineTrimed = line.trim();
                originalLine = originalLines[j];
                originalLineTrimed = originalLine.trim();
                if (m < llmDocStringLength) {
                    ({ originalLineModified, modifiedLine, originalLineKept, originalLine } = this.processLineComparison(lineTrimed, originalLineTrimed, originalLines, j, false, true));
                }
                else {
                    line = "";
                    originalLineModified = true;
                    modifiedLine = originalLines[j];
                }
                ({ htmlOrig, htmlChanges } = this.renderLineComparison(originalLineKept, htmlOrig, i, originalLine, htmlChanges, line, originalLineModified, modifiedLine));
                j++;
                if (m < llmDocStringLength) {
                    i++;
                }
            }
            i--;
            searchIndex = j;
        }
        else {
            console.log("This must not happen");
        }
        return { i, searchIndex, htmlOrig, htmlChanges };
    }

    private findHashtagCommentsLength(index: number, linesCollection: string[]) {
        let o = index;
        let hashtagComments = 0;
        //find next line not starting with #
        while (o < linesCollection.length) {
            let originalLineTrimed = linesCollection[o].trim();
            if (!originalLineTrimed.startsWith("#") && !this.isEmptyString(originalLineTrimed)) {
                break;
            }
            hashtagComments++;
            o++;
        }
        return hashtagComments;
    }

    private renderLineComparison(originalLineKept: boolean, htmlOrig: string, i: number, originalLine: string, htmlChanges: string, line: string, originalLineModified: boolean, modifiedLine: string) {
        if (originalLineKept) {
            htmlOrig += `<div class="code-block"><span class="line-number">${i + 1}:</span> ${originalLine.replace(/\r/g, '')}</div>`;//originalLine.trim()
            htmlChanges += `<div class="code-block"><span class="line-number">${i + 1}:</span> ${line}</div>`;
        } else if (originalLineModified) {
            htmlOrig += `<div class="code-block removed"><span class="line-number">${i + 1}:</span> - ${modifiedLine}</div>`; //.trimStart() modifiedLine.replace(/\r/g, '')
            htmlChanges += `<div class="code-block added"><span class="line-number">${i + 1}:</span> + ${line}</div>`;
        } else {
            htmlOrig += `<div class="code-block">&nbsp;</div>`;
            htmlChanges += `<div class="code-block added"><span class="line-number">${i + 1}:</span> + ${line}</div>`;
        }
        return { htmlOrig, htmlChanges };
    }

    private extractDocString(startIndex: number, linesCollection: string[]): number {
        let docStringLength = 0;
        let inDocString = false;

        for (let i = startIndex; i < linesCollection.length; i++) {
            let lineTrimed = linesCollection[i].trim();

            let singleLineDocString = (lineTrimed.match(/"""/g) || []).length;
            if (singleLineDocString === 2 && i === startIndex) {
                docStringLength++;
                break;
            }
            else {
                if (this.isDocStringStart(lineTrimed)) {
                    if (!inDocString) {
                        inDocString = true;
                    } else {
                        docStringLength++;
                        break;
                    }
                }

                if (inDocString) {
                    docStringLength++;
                }
            }
        }

        return docStringLength;
    }

    private isDocStringStart(lineTrimed: string) {
        return lineTrimed.startsWith('"""') || lineTrimed.startsWith("'''");
    }

    private findNextNonEmptyLine(j: number, originalLines: string[], originalLineTrimed: string) {
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

    private processLineComparison(lineTrimed: string, originalLineTrimed: string, linesCollection: string[], searchIndex: number, increment: boolean = true, strictMode: boolean = false) {
        let originalLineKept = false;
        let originalLineModified = false;
        let modifiedLine = "";
        let originalLine = "";

        if (lineTrimed === originalLineTrimed || lineTrimed.toLowerCase() === originalLineTrimed.toLowerCase()) {
            originalLineKept = true;
            originalLine = linesCollection[searchIndex];
            if (increment) {
                searchIndex++;
            }
        }
        else if (lineTrimed.includes(originalLineTrimed) || lineTrimed.toLowerCase().includes(originalLineTrimed.toLowerCase()) ||
            this.deepCheck(lineTrimed, originalLineTrimed) || (strictMode && !this.isEmptyString(lineTrimed) && !this.isEmptyString(originalLineTrimed))) {
            originalLineModified = true;
            modifiedLine = linesCollection[searchIndex];
            if (increment) {
                searchIndex++;
            }
        }

        return { originalLineModified, modifiedLine, searchIndex, originalLineKept, originalLine };
    }

    private deepCheck(lineTrimed: string, originalLineTrimed: string, similarityThreshold: number = 0.6): boolean {
        let result = false;
        const similarity = jaroWinkler(originalLineTrimed, lineTrimed);
        if (similarity >= similarityThreshold) {
            result = true;
            //console.log("Similarity: " + similarity);
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
                    padding-top: 50px;
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
                .bar-button {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 50px;
                    background-color: #333; /* Dark color for dark mode */
                    color: white;
                    border: 1px solid #555;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transition: background-color 0.3s, box-shadow 0.3s;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Shadow to give button-like appearance */
                    border-radius: 3px; /* Rounded corners */
                }
                .bar-button:hover {
                    background-color: #555; /* Lighter dark color for hover effect */
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); /* Larger shadow on hover */
                }
                .bar-button:active {
                    background-color: #777; /* Even lighter color for active effect */
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Smaller shadow on active */
                }
            </style>
        </head>
        <body>  
            <button class="bar-button" onclick="forceQuery()">Generate Documentation</button>    
            <div class="welcome-container">               
                <div class="welcome-title">Welcome to Smart Automation</div>
                <div class="welcome-message">Improve your code readability with AI-powered code comments.</div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function forceQuery() {vscode.postMessage({ command: 'forcequery' });} 
            </script>
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

    public reopenPanel() {
        if (this.panel) {
            this.panel.dispose();
            this.panel = null;
        }

        this.init();

    }

    public deactivate(): void {
        if (this.timeout) { clearInterval(this.timeout); }
        this.sessionManager = new SessionManager();
    }
}

