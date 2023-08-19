import * as ts from "typescript";

export function printNodeName(node: ts.Node, message?: string) {
  let name: string | undefined = undefined;

  if (ts.isIdentifier(node)) {
    name = node.text;
  } else if (
    ts.isVariableDeclaration(node) &&
    node.name.kind === ts.SyntaxKind.Identifier
  ) {
    name = node.name.text;
  } else if (
    ts.isFunctionDeclaration(node) &&
    node.name?.kind === ts.SyntaxKind.Identifier
  ) {
    name = node.name?.text;
  } else if (
    ts.isClassDeclaration(node) &&
    node.name?.kind === ts.SyntaxKind.Identifier
  ) {
    name = node.name?.text;
  } else if (
    ts.isMethodDeclaration(node) &&
    node.name.kind === ts.SyntaxKind.Identifier
  ) {
    name = node.name.text;
  } else if (
    ts.isPropertyDeclaration(node) &&
    node.name.kind === ts.SyntaxKind.Identifier
  ) {
    name = node.name.text;
  } else if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  ) {
    name = node.expression.getText();
  }

  if (name) {
    console.log(`Node type: ${ts.SyntaxKind[node.kind]}, Node name: ${name}`);
  } else {
    console.log("Unknown node type");
  }
}

function isType(node: ts.Node, checker: ts.TypeChecker, type: string) {
  const nodeType = checker.getTypeAtLocation(node);
  return checker.typeToString(nodeType).startsWith(type);
}

function isDeclareObsNode(node: ts.Node, checker: ts.TypeChecker) {
  const OBS_PREFIX = "Observable";
  const isVariableDeclaration = ts.isVariableDeclaration(node);
  if (isVariableDeclaration) {
    if (isType(node, checker, OBS_PREFIX)) {
      return true;
    }
  }
}

function returnsJsx(node: ts.FunctionDeclaration | ts.ArrowFunction): boolean {
  let hasJsxReturn = false;

  function visitNode(innerNode: ts.Node) {
    if (ts.isReturnStatement(innerNode) && innerNode.expression) {
      if (
        ts.isJsxElement(innerNode.expression) ||
        ts.isJsxSelfClosingElement(innerNode.expression)
      ) {
        hasJsxReturn = true;
      }
    }

    ts.forEachChild(innerNode, visitNode);
  }

  visitNode(node);
  return hasJsxReturn;
}

export function isChildOfReactNode(node: ts.Node, typeChecker: ts.TypeChecker) {
  while (node) {
    console.log("Checking");
    printNodeName(node);
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
      console.log("Is Function or Arrow declaration");
      if (returnsJsx(node)) {
        return true;
      }
    }
    node = node.parent;
  }

  return false;
}

export function findDeclareObsNodes(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
) {
  let nodes: ts.Node[] = [];
  function find(node: ts.Node) {
    if (isDeclareObsNode(node, checker)) {
      nodes.push(node);
    }
    ts.forEachChild(node, find);
  }
  ts.forEachChild(sourceFile, find);
  console.debug(`Found ${nodes.length} Observable nodes`);
  return nodes;
}

function isUseMethodCallOnObservable(
  node: ts.Node,
  typeChecker: ts.TypeChecker
): boolean {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.getText() === "use"
  ) {
    const objType = typeChecker.getTypeAtLocation(node.expression.expression);
    const symbol = objType.getSymbol();
    return symbol ? symbol.getName().startsWith("Observable") : false;
  }
  return false;
}

export function findUseObsNodes(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
) {
  let nodes: ts.Node[] = [];
  function find(node: ts.Node) {
    if (isUseMethodCallOnObservable(node, checker)) {
      nodes.push(node);
    }
    ts.forEachChild(node, find);
  }
  ts.forEachChild(sourceFile, find);
  console.debug(
    `Found ${nodes.length} Observables nodes with a '.use()' method call`
  );
  return nodes;
}

export function findReactNodes(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
) {
  let nodes: ts.Node[] = [];
  function find(node: ts.Node) {
    if (isChildOfReactNode(node, checker)) {
      nodes.push(node);
    }
    ts.forEachChild(node, find);
  }
  ts.forEachChild(sourceFile, find);
  console.debug(`Found ${nodes.length} React nodes`);
  return nodes;
}

function isUseSelectorNode(node: ts.Node, checker: ts.TypeChecker): boolean {
  // Check if the node is a CallExpression
  if (ts.isCallExpression(node)) {
    // Check if the expression being called is an Identifier with the name 'useSelector'
    const expression = node.expression;
    if (ts.isIdentifier(expression) && expression.text === "useSelector") {
      return true;
    }

    // Additional check for named or default imports
    if (
      ts.isPropertyAccessExpression(expression) &&
      expression.name.text === "useSelector"
    ) {
      const symbol = checker.getSymbolAtLocation(expression.expression);
      if (symbol) {
        const type = checker.getTypeOfSymbolAtLocation(
          symbol,
          expression.expression
        );
        if (type) {
          const signatures = checker.getSignaturesOfType(
            type,
            ts.SignatureKind.Call
          );
          if (signatures.length > 0) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export function findUseSelectorNodes(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): ts.CallExpression[] {
  let nodes: ts.CallExpression[] = [];
  function find(node: ts.Node) {
    if (isUseSelectorNode(node, checker)) {
      nodes.push(node as ts.CallExpression);
    }
    ts.forEachChild(node, find);
  }
  ts.forEachChild(sourceFile, find);
  return nodes;
}
