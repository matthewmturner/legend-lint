import * as vscode from "vscode";

import { checkDocument } from "./checks";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('"Legend lint" is now active!');
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("typeChecker");
  let disposable = vscode.commands.registerCommand("extension.findType", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      checkDocument(editor.document, diagnosticCollection);
    }
  });
  const inScopeLanguages = ["typescript", "typescriptreact"];
  context.subscriptions.push(disposable);

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    checkDocument(document, diagnosticCollection);
  });

  vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
    const { languageId } = document;
    if (inScopeLanguages.includes(languageId)) {
      checkDocument(document, diagnosticCollection);
    }
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    const { languageId } = event.document;
    if (inScopeLanguages.includes(languageId)) {
      checkDocument(event.document, diagnosticCollection);
    }
  });

  // Run the check on all currently open text documents
  vscode.workspace.textDocuments.forEach((document) => {
    const { languageId } = document;
    if (inScopeLanguages.includes(languageId)) {
      checkDocument(document, diagnosticCollection);
    }
  });

  context.subscriptions.push(diagnosticCollection);
}

// This method is called when your extension is deactivated
export function deactivate() {}
