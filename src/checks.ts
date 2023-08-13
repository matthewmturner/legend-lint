import * as vscode from "vscode";
import * as ts from "typescript";
import {
  findDeclareObsNodes,
  findUseObsNodes,
  isChildOfReactNode,
} from "./utils/nodes";

const LINT_CHECKS = [checkCorrectObsNaming, checkUseInReactComponent];

export function checkDocument(document: vscode.TextDocument) {
  const program = ts.createProgram([document.fileName], {});
  const sourceFile = program.getSourceFile(document.fileName);
  const checker = program.getTypeChecker();
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("typeChecker");
  if (sourceFile) {
    const diagnostics: vscode.Diagnostic[] = [];
    runChecks({ sourceFile, checker, diagnostics });
    console.debug(`Found ${diagnostics.length} diagnostics`);
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
        message: `Variable '${variableName}' of type 'Observable' doesn't end with '${obsSuffix}'`,
        source: "legend-lint",
      };
      diagnostics.push(diagnostic);
    }
  });
}

function createVSCDiagnostic(node: ts.Node): vscode.Diagnostic {
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
    "Observable.use() called outside of a React component",
    vscode.DiagnosticSeverity.Warning
  );
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
      console.log("Parent of useObs is not a react node");
      const diagnostic = createVSCDiagnostic(node);
      diagnostics.push(diagnostic);
    }
  });
}
