// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// @ts-ignore
import * as espree from 'espree';
// @ts-ignore
import * as eslintScope from 'eslint-scope';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "legend-lint" is now active!');

    vscode.languages.registerCodeActionsProvider({scheme: 'file', language: 'javascript'}, {
        provideCodeActions(document, range, context, token) {
            const text = document.getText();
            console.log('Text: ', text);
            const ast = espree.parse(text, {ecmaVersion: 6, sourceType: 'module'});
            console.log('Parsed');
            const scopeManager = eslintScope.analyze(ast, {ecmaVersion: 6, sourceType: 'module'});
            console.log('Got scopeManager');
            const variables = scopeManager.scopes[0].variables;
            console.log('Variables: ', variables);
            return undefined;
        }
    });

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('legend-lint.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Legend-Lint!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
