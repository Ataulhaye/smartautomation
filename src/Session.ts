/*
 * Copyright (c) 2025 Ata Ul Haye.
 *
 * All rights reserved.
 *
 * This project, "Python Smart Automation" extension, including all associated source code,
 * documentation, and related files, is the intellectual property of Ata Ul Haye. You may
 * use, modify, and distribute this project in accordance with the terms of the MIT License.
 */

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