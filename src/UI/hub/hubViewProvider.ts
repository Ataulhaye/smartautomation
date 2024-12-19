import * as vscode from 'vscode';

export class HubViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'hubView';
  private _view?: vscode.WebviewView;
  private context: vscode.ExtensionContext;

  constructor(
    private readonly _extensionUri: vscode.Uri, 
    context: vscode.ExtensionContext
  ) {
    this.context = context;
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
      </head>
      <body>
        <h1>Documentation HUB</h1>
        <section id="analytics">
          <h2>Analytics & Coverage</h2>
          <div id="analytics-placeholder">Analytics and coverage will be displayed here.</div>
        </section>
        <section id="settings">
          <h2>Settings</h2>
          <label for="verbosity">Comment Verbosity:</label>
          <select id="verbosity">
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
          </select>
          <br>
          <label for="style">Comment Style:</label>
          <select id="style">
            <option value="high-level">High-Level Explanation</option>
            <option value="in-depth">In-Depth Explanation</option>
          </select>
        </section>
        <section id="actions">
          <h2>Actions</h2>
          <button id="generate-doc">Generate Markdown Documentation</button>
          <button id="project-doc">Generate Project-Wide Documentation</button>
        </section>
      </body>
      </html>
    `;
  }
}
