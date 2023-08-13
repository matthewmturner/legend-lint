import * as vscode from "vscode";

import { checkDocument } from "./checks";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('"Legend lint" is now active!');
  let disposable = vscode.commands.registerCommand("extension.findType", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      checkDocument(editor.document);
    }
  });

  context.subscriptions.push(disposable);

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    checkDocument(document);
  });

  vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
    checkDocument(document);
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    const { document } = event;
    if (document.languageId === "typescript") {
      checkDocument(document);
    }
  });

  // Run the check on all currently open text documents
  vscode.workspace.textDocuments.forEach((document) => {
    checkDocument(document);
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
