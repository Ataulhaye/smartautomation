import { Console } from 'console';
import { Session } from './Session'; // Adjust the import path as necessary
import * as vscode from 'vscode';

export class SessionManager {
    private sessions: { [key: string]: Session } = {};
    private interval: number = 10000;

    constructor() {
        try {
            const config = vscode.workspace.getConfiguration('Parameters');
            this.interval = config.get<number>('interval') || 10000;
        } catch (error) { }
    }


    public getSession(fileName: string): any {
        return this.sessions[fileName];
    }

    public createOrUpdateSession(
        fileName: string,
        fileCurrentContent: string,
        commentedCode: string,
        panel: vscode.WebviewPanel | null
    ): void {
        if (this.sessions[fileName]) {
            this.sessions[fileName].updateSession(fileCurrentContent, commentedCode, panel);
            console.log("Exising Whole Session Updated");
        } else {
            this.sessions[fileName] = new Session(fileName, fileCurrentContent, commentedCode, panel);
            console.log("New Session Created");
        }
    }

    public renewSessionState(
        fileName: string,
        fileCurrentContent: string,
        commentedCode: string,
        panel: vscode.WebviewPanel | null
    ): void {
        if (this.sessions[fileName]) {
            this.sessions[fileName].filePreviousContent = fileCurrentContent;
            this.sessions[fileName].fileCurrentContent = fileCurrentContent;
            this.sessions[fileName].lastModified = new Date();
            this.sessions[fileName].panel = panel;
            this.sessions[fileName].commentedCode = commentedCode;
            console.log("Session Renewed");
        }
    }

    public updateSessionfileCurrentContent(
        fileName: string,
        fileCurrentContent: string,
    ): void {
        if (this.sessions[fileName]) {
            this.sessions[fileName].fileCurrentContent = fileCurrentContent;
            console.log("Only fileCurrentContent Updated in Existing Session");
        }
    }

    public shouldQueryLLM(fileName: string): boolean {
        const session: Session = this.sessions[fileName];
        if (!session) {
            return true;
        }
        const now = new Date();
        const lastModified = new Date(session.lastModified);
        const timeDiff = (now.getTime() - lastModified.getTime()) / 1000;
        console.log(`Is Content Same: ${session.fileCurrentContent === session.filePreviousContent}`);

        return timeDiff > (this.interval / 1000) && session.fileCurrentContent !== session.filePreviousContent;
    }
}