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

function findSelectorNodes(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  typeName: string
) {
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
    if (name.getText() !== "get") {
      ts.forEachChild(node, visit);
      return;
    }

    // Now, we know we have a 'get' call, but we don't know if it's within a useSelector context.
    // We'll check the parent nodes of the 'get' call to see if any of them are a useSelector call.
    let current: ts.Node | undefined = node;
    let inUseSelectorContext = false;
    while (current) {
      // If the current node is a call to useSelector, we know our 'get' call is in a useSelector context.
      if (
        ts.isCallExpression(current) &&
        ts.isIdentifier(current.expression) &&
        current.expression.text === "useSelector"
      ) {
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
