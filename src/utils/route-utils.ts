/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { findNodes, getDecoratorMetadata, insertAfterLastOccurrence } from './ast-utils';
import { Change, InsertChange, NoopChange } from './change';
import { ModuleOptions } from './find-module';
import { camelize, classify } from '@angular-devkit/core/src/utils/strings';


/**
 * Add Import `import { symbolName } from fileName` if the import doesn't exit
 * already. Assumes fileToEdit can be resolved and accessed.
 * @param fileToEdit (file we want to add import to)
 * @param symbolName (item to import)
 * @param fileName (path to the file)
 * @param isDefault (if true, import follows style for importing default exports)
 * @param existingChagnes
 * @return Change
 */

export function insertImport(source: ts.SourceFile, fileToEdit: string, symbolName: string,
                             fileName: string, isDefault = false, existingChagnes: InsertChange[] = []): Change {
  const rootNode = source;
  const allImports = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
  let prevImports: any;

  existingChagnes.some((change, index) => {
    const text = change.toAdd;
    if (text && text.indexOf('import') > -1
      && text.indexOf('*') === -1
      && text.indexOf(fileName) > -1
    ) {
      const importsArray = text.match(/{(.*)}/im);

      if (importsArray) {
        importsArray.shift();
        prevImports = {};
        prevImports.text = importsArray[0].trim();
        prevImports.coma = (prevImports.text.lastIndexOf(',') === prevImports.text.length - 1) ? '' : ',';
      }

      existingChagnes.splice(index, 1);

      return true;
    } else {
      return false;
    }
  });

  // get nodes that map to import statements from the file fileName
  const relevantImports = allImports.filter(node => {
    // StringLiteral of the ImportDeclaration is the import file (fileName in this case).
    const importFiles = node.getChildren()
      .filter(child => child.kind === ts.SyntaxKind.StringLiteral)
      .map(n => (n as ts.StringLiteral).text);

    return importFiles.filter(file => file === fileName).length === 1;
  });

  if (relevantImports.length > 0) {
    let importsAsterisk = false;
    // imports from import file
    const imports: ts.Node[] = [];
    relevantImports.forEach(n => {
      Array.prototype.push.apply(imports, findNodes(n, ts.SyntaxKind.Identifier));
      if (findNodes(n, ts.SyntaxKind.AsteriskToken).length > 0) {
        importsAsterisk = true;
      }
    });

    // if imports * from fileName, don't add symbolName
    if (importsAsterisk) {
      return new NoopChange();
    }

    const importTextNodes = imports.filter(n => (n as ts.Identifier).text === symbolName);

    // insert import if it's not there
    if (importTextNodes.length === 0) {
      const fallbackPos =
        findNodes(relevantImports[0], ts.SyntaxKind.CloseBraceToken)[0].getStart() ||
        findNodes(relevantImports[0], ts.SyntaxKind.FromKeyword)[0].getStart();

      let insertText = `, ${symbolName}`;

      if (prevImports) {
        insertText = `, ${prevImports.text}${prevImports.coma} ${symbolName}`
      }

      return insertAfterLastOccurrence(imports, insertText, fileToEdit, fallbackPos);
    }

    return new NoopChange();
  }

  // no such import declaration exists
  const useStrict = findNodes(rootNode, ts.SyntaxKind.StringLiteral)
    .filter((n: ts.StringLiteral) => n.text === 'use strict');
  let fallbackPos = 0;
  if (useStrict.length > 0) {
    fallbackPos = useStrict[0].end;
  }

  const open = isDefault ? '' : '{ ';
  const close = isDefault ? '' : ' }';
  // if there are no imports or 'use strict' statement, insert import at beginning of file
  const insertAtBeginning = allImports.length === 0 && useStrict.length === 0;
  const separator = insertAtBeginning ? '' : ';\n';

  let toInsert = `${separator}import ${open}${symbolName}${close}` +
    ` from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;

  if (prevImports) {
    toInsert = `${separator}import ${open}${prevImports.text}${prevImports.coma} ${symbolName}${close}` +
      ` from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;
  }

  return insertAfterLastOccurrence(
    allImports,
    toInsert,
    fileToEdit,
    fallbackPos,
    ts.SyntaxKind.StringLiteral
  );
}

/**
 *
 * @param obj
 * @param url
 * @param componentName
 * @param {boolean} check
 * @returns {boolean}
 */
export function checkIfRouteExists(obj: any, url, componentName, check = false) {

  check = obj.properties
    && obj.properties[0]
    && obj.properties[0].initializer.text === url
    && obj.properties[1]
    && obj.properties[1].initializer.text === componentName;

  if (check) {
    return check;
  }

  const children = obj.properties.find(prop => prop.name.text === 'children');
  if (children) {
    const childrenArrNode = children
      .getChildren()
      .find(node => node.kind === ts.SyntaxKind.ArrayLiteralExpression);

    if (childrenArrNode) {
      const childrenArr = childrenArrNode.getChildren().find(node => node.kind === ts.SyntaxKind.SyntaxList);
      if (childrenArr) {
        childrenArr.getChildren()
          .filter(prop => prop.kind == ts.SyntaxKind.ObjectLiteralExpression)
          .forEach(objectNode => {
            checkIfRouteExists(objectNode, url, componentName, check);
          });
      }
    }
  }

  return check;

}

export function addRouteModuleToModuleImports(source, ngModulePath) {
  const nodes = getDecoratorMetadata(source, 'NgModule', '@angular/core');
  const node = nodes[0];  // tslint:disable-line:no-any
  // Find the decorator declaration.
  if (!node) {
    return [];
  }

  const changes: any = [];

  const matchingProperties: ts.ObjectLiteralElement[] =
    (node as ts.ObjectLiteralExpression).properties
      .filter(prop => prop.kind == ts.SyntaxKind.PropertyAssignment)
      .filter((prop: any) => prop.name && prop.name.text === 'imports');

  if (matchingProperties[0]) {
    const importsArrayLiteral = matchingProperties[0].getChildren()
      .find(child => child.kind === ts.SyntaxKind.ArrayLiteralExpression);

    if (importsArrayLiteral) {
      const importsArrayNode = importsArrayLiteral.getChildren()
        .find(child => child.kind === ts.SyntaxKind.SyntaxList);

      if (importsArrayNode) {
        const importsArrayElements = importsArrayNode.getChildren();

        importsArrayElements.forEach((child: any) => {
          if (child.kind === ts.SyntaxKind.CallExpression) {
            if (child.expression
              && (child.expression.name.text === 'forRoot' || child.expression.name.text === 'forChild')
              && child.expression.expression && child.expression.expression.text === 'RouterModule') {

              const hasAddedRoutes = child.arguments.find(arg => arg.text === 'routes');

              if (!hasAddedRoutes && child.arguments.length === 0) {
                const forChildren = child.getChildren();
                if (forChildren) {
                  const paren = forChildren.find(forChild => forChild.kind === ts.SyntaxKind.OpenParenToken)
                  if (paren) {
                    const position = paren.getEnd();
                    const toInsert = `routes`;
                    const change = new InsertChange(ngModulePath || '', position, toInsert);
                    changes.push(change);
                  }
                }
              }
            } else {
              const lastImportedElem = importsArrayElements[importsArrayElements.length - 1];

              const position = lastImportedElem.getEnd();
              const toInsert = `\nRouterModule.forChild(routes),\n`;
              const change = new InsertChange(ngModulePath || '', position, toInsert);
              changes.push(change);
            }
          }
        });

        if (importsArrayElements.length === 0) {
          const openBracketNode = importsArrayLiteral.getChildren()
            .find(literalChild => literalChild.kind === ts.SyntaxKind.OpenBracketToken);

          if (openBracketNode) {
            const position = openBracketNode.getEnd();
            const toInsert = `RouterModule.forChild(routes),`;
            const change = new InsertChange(ngModulePath || '', position, toInsert);
            changes.push(change);
          }
        }
      }
    }
  } else {
    const props = (node as any).properties;
    let position;
    let coma = '';

    if (props.length > 0) {
      const lastProp = props[props.length - 1];
      const lastChild = lastProp.getChildren().pop();

      if (lastChild.kind !== ts.SyntaxKind.CommaToken) {
        coma = ','
      }

      position = lastChild.getEnd();
    } else {
      const sl = node.getChildren()
        .find(child => child.kind === ts.SyntaxKind.SyntaxList);

      if (sl) {
        position = sl.getEnd();
      }
    }

    if (position) {
      const toInsert = `${coma}\n  imports: [ RouterModule.forChild(routes), ],\n`;
      const change = new InsertChange(ngModulePath || '', position, toInsert);
      changes.push(change);
    }
  }

  return changes;
}


export function addRoutesArrayDeclaration(
  source: ts.SourceFile,
  ngModulePath: string,
  componentName: string,
  importPath: string | null = null,
  options: ModuleOptions
  ) {

  const changes: any = [];
  const url = options.name;
  const resolverName = `${classify(options.name)}Resolve`;

  const routesArrayNodes = findNodes(source, ts.SyntaxKind.ArrayLiteralExpression);

  if (!routesArrayNodes) {
    return [];
  }

  const routesArrayNode = routesArrayNodes
    .find((node: ts.ArrayLiteralExpression) => {
      const nodeParent = <any>node.parent;

      return nodeParent.getChildren().find((pNode) => {
        return pNode.kind === ts.SyntaxKind.TypeReference && pNode.typeName.text === 'Routes'
      });
    }) as ts.ArrayLiteralExpression;

  if (routesArrayNode) {
    const matchingProperties =
      routesArrayNode.getChildren()
        .filter(prop => prop.kind == ts.SyntaxKind.SyntaxList);

    let duplicated = false;
    if (matchingProperties) {
      matchingProperties[0].getChildren()
        .filter(prop => prop.kind == ts.SyntaxKind.ObjectLiteralExpression)
        .forEach((prop: any) => {
          if (!duplicated) {
            duplicated = checkIfRouteExists(prop, url, componentName);
          }
        });
    }

    if (duplicated) {
      return changes
    }

    changes.push(
      ...addRouteModuleToModuleImports(source, ngModulePath),
      ...addRouteToExistingRoutes(source, routesArrayNode, ngModulePath, componentName, importPath, options)
    );

    return changes;

  } else {
    const allImports = findNodes(source, ts.SyntaxKind.ImportDeclaration);
    const lastImport = allImports.pop();

    if (lastImport) {
      const position = lastImport.getEnd();

      const route = ((options.mode === 'full') && options.secondLevel)
      ? `  { path: '${url}', pathMatch: 'full', component: ${componentName},\n` +
        `     resolve: {\n ` +
        `       ${camelize(url)}: ${resolverName}\n` +
        `     }\n` +
        `   },\n` +
        `   { path: '${url}/:id', component: ${componentName},\n` +
        `     resolve: { \n` +
        `      ${camelize(url)}: ${resolverName}\n` +
        `     }\n` +
        `   },`
      : `  { path: '${url}:', component: ${componentName} },`;

      const toInsert = `\n\nexport const routes: Routes = [\n${route}\n];`;

      changes.push(
        new InsertChange(ngModulePath || '', position, toInsert),
        insertImport(source, ngModulePath || '', componentName, importPath || '')
      );

      changes.push(...addRouteModuleToModuleImports(source, ngModulePath));
      changes.push(
        insertImport(source, ngModulePath || '', 'Routes', '@angular/router', false, changes)
      );

      return changes;
    } else {
      return changes;
    }
  }
}

export function addRouteToExistingRoutes(
  source: ts.SourceFile,
  routesArrayNode,
  ngModulePath: string,
  componentName: string,
  importPath: string | null = null,
  options: ModuleOptions,
) {
  const changes: any = [];
  const url = options.name;
  const resolverName = `${classify(options.name)}Resolve`;

  let insertPosition: number | null = null;

  const wildCardRoute = routesArrayNode.elements.find((routeElement) => {
    if (routeElement.kind !== ts.SyntaxKind.ObjectLiteralExpression) { return false }

    const pathProperty = routeElement.properties
      .find((property) => property.name && property.name.text === 'path');

    return (pathProperty && pathProperty.initializer.text === '**') || false
  });

  if (wildCardRoute) {
    insertPosition = wildCardRoute.getFullStart() + 1;
  } else {
    const routesNodes = routesArrayNode.getChildren();
    const endOfRoutesArray = routesNodes.find((childNode) => {
      return childNode.kind === ts.SyntaxKind.CloseBracketToken;
    });

    // const bracketIndex = routesNodes.indexOf(endOfRoutesArray);
    if (endOfRoutesArray &&
      endOfRoutesArray.parent &&
      endOfRoutesArray.parent.elements &&
      endOfRoutesArray.parent.elements.pos !== endOfRoutesArray.parent.elements.end &&
      !endOfRoutesArray.parent.elements.hasTrailingComma) {
      changes.push(new InsertChange(ngModulePath || '', endOfRoutesArray.parent.elements.end, ','));
    }

    if (endOfRoutesArray) {
      insertPosition = endOfRoutesArray.getEnd() - 1;
    }
  }

  if (insertPosition === null || insertPosition < 0) { return changes}

  const endComa = wildCardRoute ? ',' : '';

  const toInsert = ((options.mode === 'full') && options.secondLevel)
    ? `  { path: '', pathMatch: 'full', component: ${componentName},\n` +
      `    resolve: {\n ` +
      `      ${camelize(url)}: ${resolverName}\n` +
      `     }\n` +
      `  },\n` +
      `  { path: ':id', component: ${componentName},\n` +
      `    resolve: {\n` +
      `     ${camelize(url)}: ${resolverName}\n` +
      `    }\n` +
      `  }${endComa}\n `
    : `  { path: '', component: ${componentName} }${endComa}\n`;

  changes.push(
    new InsertChange(ngModulePath || '', insertPosition, toInsert),
    insertImport(source, ngModulePath || '', componentName, importPath || '')
  );

  return changes;
}

