import * as vscode from "vscode";

import { checkDocument } from "./checks";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "legend-lint" is now active!');
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

  // Run the check on all currently open text documents
  vscode.workspace.textDocuments.forEach((document) => {
    checkDocument(document);
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}

// function findUseObsNodes(sourceFile: ts.SourceFile, checker: ts.TypeChecker) {
//   let nodes: ts.Node[] = [];
//   function find(node: ts.Node) {
//     if (isReactNode(node, checker)) {
//       nodes.push(node);
//     }
//   const isVariableDeclaration = ts.isVariableDeclaration(node);
//   if (isVariableDeclaration) {
//     if (isType(node, checker, type)) {
//       nodes.push(node);
//     }
//   }
//     ts.forEachChild(node, find);
//   }
//   ts.forEachChild(sourceFile, find);
//   return nodes;
// }

// function checkUseInReactComponent({
//   sourceFile,
//   checker,
//   diagnostics,
// }: {
//   sourceFile: ts.SourceFile;
//   checker: ts.TypeChecker;
//   diagnostics: vscode.Diagnostic[];
// }) {
//   const selectorNodes = findSelectorNodes(
//     sourceFile,
//     checker,
//     "Observable"
//   ).filter((node) => isReactNode(node, checker));
//   console.debug(
//     `Found ${selectorNodes.length} useSelector calls in React components`
//   );
//   selectorNodes.forEach((node) => {
//     const { line, character } = sourceFile.getLineAndCharacterOfPosition(
//       node.getStart()
//     );
//     const diagnostic: vscode.Diagnostic = {
//       severity: vscode.DiagnosticSeverity.Warning,
//       range: new vscode.Range(
//         new vscode.Position(line, character),
//         new vscode.Position(line, character + node.getText().length)
//       ),
//       message: `useSelector call in React component`,
//       source: "legend-lint",
//     };
//     diagnostics.push(diagnostic);
//   });
// }
