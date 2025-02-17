import * as vscode from 'vscode';

export class Session {
    public activePythonFile: string;
    public lastModified: Date;
    public filePreviousContent: string;
    public fileCurrentContent: string;
    public commentedCode: string;
    public panel: vscode.WebviewPanel | null;

    constructor(
        activePythonFile: string,
        fileCurrentContent: string,
        commentedCode: string,
        panel: vscode.WebviewPanel | null
    ) {
        this.activePythonFile = activePythonFile;
        this.lastModified = new Date();
        this.filePreviousContent = fileCurrentContent;
        this.fileCurrentContent = fileCurrentContent;
        this.commentedCode = commentedCode;
        this.panel = panel;
    }

    public updateSession(
        fileCurrentContent: string,
        commentedCode: string,
        panel: vscode.WebviewPanel | null
    ): void {

        this.lastModified = new Date();
        this.filePreviousContent = this.fileCurrentContent;
        this.fileCurrentContent = fileCurrentContent;
        this.commentedCode = commentedCode;
        this.panel = panel;

    }
}