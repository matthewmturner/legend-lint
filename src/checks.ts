import * as vscode from "vscode";
import * as ts from "typescript";
import {
  findDeclareObsNodes,
  findUseObsNodes,
  findUseSelectorNodes,
  isChildOfReactNode,
} from "./utils/nodes";

const LINT_CHECKS = [
  checkCorrectObsNaming,
  checkUseInReactComponent,
  checkSelectorWithSingleGet,
];

function createVSCDiagnostic(
  node: ts.Node,
  message: string
): vscode.Diagnostic {
  const start = node.getStart();
  const end = node.getEnd();
  const sourceFile = node.getSourceFile();

  const startPos = sourceFile.getLineAndCharacterOfPosition(start);
  const endPos = sourceFile.getLineAndCharacterOfPosition(end);

  const range = new vscode.Range(
    startPos.line,
    startPos.character,
    endPos.line,
    endPos.character
  );

  return new vscode.Diagnostic(
    range,
    message,
    vscode.DiagnosticSeverity.Warning
  );
}

export function checkDocument(
  document: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection
) {
  const program = ts.createProgram([document.fileName], {});
  const sourceFile = program.getSourceFile(document.fileName);
  const checker = program.getTypeChecker();
  if (sourceFile) {
    const diagnostics: vscode.Diagnostic[] = [];
    runChecks({ sourceFile, checker, diagnostics });
    console.debug(`Found ${diagnostics.length} diagnostics`);
    diagnosticCollection.set(document.uri, []);
    diagnosticCollection.set(document.uri, diagnostics);
  }
}

function runChecks({
  sourceFile,
  checker,
  diagnostics,
}: {
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
  diagnostics: vscode.Diagnostic[];
}) {
  LINT_CHECKS.forEach((check) => {
    check({ sourceFile, checker, diagnostics });
  });
}

function checkCorrectObsNaming({
  sourceFile,
  checker,
  diagnostics,
}: {
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
  diagnostics: vscode.Diagnostic[];
}) {
  const obsSuffix = "$";
  const observableNodes = findDeclareObsNodes(sourceFile, checker);

  observableNodes.forEach((node) => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart()
    );
    const variableName = (node as ts.VariableDeclaration).name.getText();
    if (!variableName.endsWith(obsSuffix)) {
      const diagnostic: vscode.Diagnostic = {
        severity: vscode.DiagnosticSeverity.Warning,
        range: new vscode.Range(
          new vscode.Position(line, character),
          new vscode.Position(line, character + variableName.length)
        ),
        message: `Observable '${variableName}' doesn't end with '${obsSuffix}'`,
        source: "legend-lint",
      };
      diagnostics.push(diagnostic);
    }
  });
}

function checkUseInReactComponent({
  sourceFile,
  checker,
  diagnostics,
}: {
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
  diagnostics: vscode.Diagnostic[];
}) {
  const useObsNodes = findUseObsNodes(sourceFile, checker);
  useObsNodes.forEach((node) => {
    if (!isChildOfReactNode(node, checker)) {
      const diagnostic = createVSCDiagnostic(
        node,
        "Observable.use() called outside of a React component"
      );
      diagnostics.push(diagnostic);
    }
  });
}

function checkSelectorWithSingleGet({
  sourceFile,
  checker,
  diagnostics,
}: {
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
  diagnostics: vscode.Diagnostic[];
}) {
  const useSelectorNodes = findUseSelectorNodes(sourceFile, checker);
  useSelectorNodes.forEach((node) => {
    const arg = node.arguments[0];
    let callExpr: ts.Expression | null = null;

    if (ts.isArrowFunction(arg) && ts.isCallExpression(arg.body)) {
      // Handle the case of `useSelector(() => var.get())`
      callExpr = arg.body.expression;
    } else if (ts.isCallExpression(arg)) {
      // Handle the case of `useSelector(var.get())`
      callExpr = arg.expression;
    }

    if (
      callExpr &&
      ts.isPropertyAccessExpression(callExpr) &&
      callExpr.name.text === "get"
    ) {
      // Check if the object of the method call is an identifier (variable)
      if (ts.isIdentifier(callExpr.expression)) {
        // Check if this variable is defined in the surrounding scope
        const symbol = checker.getSymbolAtLocation(callExpr.expression);
        if (symbol) {
          const diagnostic = createVSCDiagnostic(
            node,
            "Single `.get()` method call in `useSelector` can be replaced with `.use()` on the variable"
          );
          diagnostics.push(diagnostic);
        }
      }
    }
  });
}
