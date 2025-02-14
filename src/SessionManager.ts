import { Session } from './Session'; // Adjust the import path as necessary
import * as vscode from 'vscode';

export class SessionManager {
    private sessions: { [key: string]: Session } = {};

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
        } else {
            this.sessions[fileName] = new Session(fileName, fileCurrentContent,  commentedCode, panel);
        }
    }

    public updateSessionfileCurrentContent(
        fileName: string,
        fileCurrentContent: string,
    ): void {
        if (this.sessions[fileName]) {
            this.sessions[fileName].fileCurrentContent = fileCurrentContent;
        }
    }

    

    public shouldQueryLLM(fileName: string): boolean {
        const session : Session = this.sessions[fileName];
        if (!session) {
            return true;
        }
        const now = new Date();
        const lastModified = new Date(session.lastModified);
        const timeDiff = (now.getTime() - lastModified.getTime()) / 1000;
        console.log(`Content Same or not: ${session.fileCurrentContent === session.filePreviousContent}`);  

        return timeDiff > 10 && session.fileCurrentContent !== session.filePreviousContent;
    }
}