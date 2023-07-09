import * as vscode from 'vscode';
import * as ts from 'typescript';

const SUFFIX = '$';
const TARGET_PREFIX = 'Observable';

function isType(node: ts.Node, checker: ts.TypeChecker, type: string) {
  const nodeType = checker.getTypeAtLocation(node);
  return checker.typeToString(nodeType).startsWith(type);
}

function findObservableNodes(sourceFile: ts.SourceFile, checker: ts.TypeChecker, type: string) {
  let nodes: ts.Node[] = [];
  function find(node: ts.Node) {
    const isVariableDeclaration = ts.isVariableDeclaration(node);
    if (isVariableDeclaration) {
        if (isType(node, checker, type)) {
            nodes.push(node);
        }
    }
    ts.forEachChild(node, find);
  }
  ts.forEachChild(sourceFile, find);
  return nodes;
}

function findSelectorNodes(sourceFile: ts.SourceFile, checker: ts.TypeChecker, typeName: string) {
    const nodes: ts.Node[] = [];
    ts.forEachChild(sourceFile, function visit(node) {
        // We're only interested in CallExpressions, as the 'get' method call is a CallExpression.
        if (!ts.isCallExpression(node)) {
            ts.forEachChild(node, visit);
            return;
        }

        const { expression } = node;

        // Inside the CallExpression, we need to check if the called function is 'get'.
        // To do that, we need to ensure the expression of the CallExpression is a PropertyAccessExpression, 
        // because in a 'get' call like goodVar$.get(), 'goodVar$.get' is a PropertyAccessExpression.
        if (!ts.isPropertyAccessExpression(expression)) {
            ts.forEachChild(node, visit);
            return;
        }

        const { name } = expression;

        // We need to verify the name of the PropertyAccessExpression is 'get'. If not, skip this node.
        if (name.getText() !== 'get') {
            ts.forEachChild(node, visit);
            return;
        }

        // Now, we know we have a 'get' call, but we don't know if it's within a useSelector context.
        // We'll check the parent nodes of the 'get' call to see if any of them are a useSelector call.
        let current: ts.Node | undefined = node;
        let inUseSelectorContext = false;
        while (current) {
            // If the current node is a call to useSelector, we know our 'get' call is in a useSelector context.
            if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === 'useSelector') {
                inUseSelectorContext = true;
                break;
            }
            // If the current node is not a useSelector call, we'll move to its parent and check again.
            current = current.parent;
        }

        // If the 'get' call is not in a useSelector context, we'll add it to our list of nodes to raise a warning for.
        if (!inUseSelectorContext) {
            nodes.push(node);
        }

        // Continue the recursion for child nodes.
        ts.forEachChild(node, visit);
    });

    return nodes;
}


function checkDocument(document: vscode.TextDocument) {
    const program = ts.createProgram([document.fileName], {});
    const sourceFile = program.getSourceFile(document.fileName);
    const checker = program.getTypeChecker();
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('typeChecker');
    if (sourceFile) {
        const diagnostics: vscode.Diagnostic[] = [];
        const observableNodes = findObservableNodes(sourceFile, checker, TARGET_PREFIX);
        console.debug(`Found ${observableNodes.length} nodes that match the type ${TARGET_PREFIX}`);
        observableNodes.forEach(node => {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const variableName = (node as ts.VariableDeclaration).name.getText();
            if (!variableName.endsWith(SUFFIX)) {
                const diagnostic: vscode.Diagnostic = {
                    severity: vscode.DiagnosticSeverity.Warning,
                    range: new vscode.Range(
                        new vscode.Position(line, character),
                        new vscode.Position(line, character + variableName.length)
                    ),
                    message: `Variable '${variableName}' of type 'Observable' doesn't end with '${SUFFIX}'`,
                    source: 'legend-lint'
                };
                diagnostics.push(diagnostic);
            }
        });

        const selectorNodes = findSelectorNodes(sourceFile, checker, TARGET_PREFIX);
        console.debug(`Found ${selectorNodes.length} selector nodes`);
        selectorNodes.forEach(node => {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const diagnostic: vscode.Diagnostic = {
                severity: vscode.DiagnosticSeverity.Warning,
                range: new vscode.Range(
                    new vscode.Position(line, character),
                    new vscode.Position(line, character + node.getText().length)
                ),
                message: `get() must be called in an observing context`,
                source: 'legend-lint'
            };
            diagnostics.push(diagnostic);
            
        });

        console.debug(`Found ${diagnostics.length} diagnostics`)
        diagnosticCollection.set(document.uri, diagnostics);
    }
}


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "legend-lint" is now active!');
    let disposable = vscode.commands.registerCommand('extension.findType', () => {
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
