import * as ts from 'typescript';
import { Change, InsertChange, NoopChange } from './change';
import { findNodes, insertAfterLastOccurrence } from './ast-utils';

export function insertExport(source: ts.SourceFile, fileToEdit: string, symbolName: string,
                             fileName: string, isDefault = false, existingChanges: InsertChange[] = []): Change {

  const rootNode = source;
  const allExports = findNodes(rootNode, ts.SyntaxKind.ExportDeclaration);
  let prevExports: any;

  existingChanges.some((change, index) => {
    const text = change.toAdd;
    if (text && text.indexOf('export') > -1
      && text.indexOf('*') === -1
      && text.indexOf(fileName) > -1
    ) {
      const exportsArray = text.match(/{(.*)}/im);

      if (exportsArray) {
        exportsArray.shift();
        prevExports = {};
        prevExports.text = exportsArray[0].trim();
        prevExports.coma = (prevExports.text.lastIndexOf(',') === prevExports.text.length - 1) ? '' : ',';
      }

      existingChanges.splice(index, 1);

      return true;
    } else {
      return false;
    }
  });

  // get nodes that map to import statements from the file fileName
  const relevantExports = allExports.filter(node => {
    // StringLiteral of the ImportDeclaration is the import file (fileName in this case).
    const exportFiles = node.getChildren()
      .filter(child => child.kind === ts.SyntaxKind.StringLiteral)
      .map(n => (n as ts.StringLiteral).text);

    return exportFiles.filter(file => file === fileName).length === 1;
  });

  if (relevantExports.length > 0) {
    let exportsAsterisk = false;
    // imports from import file
    const exports: ts.Node[] = [];
    relevantExports.forEach(n => {
      Array.prototype.push.apply(exports, findNodes(n, ts.SyntaxKind.Identifier));
      if (findNodes(n, ts.SyntaxKind.AsteriskToken).length > 0) {
        exportsAsterisk = true;
      }
    });

    // if imports * from fileName, don't add symbolName
    if (exportsAsterisk) {
      return new NoopChange();
    }

    const exportTextNodes = exports.filter(n => (n as ts.Identifier).text === symbolName);

    // insert import if it's not there
    if (exportTextNodes.length === 0) {
      const fallbackPos =
        findNodes(relevantExports[0], ts.SyntaxKind.CloseBraceToken)[0].getStart() ||
        findNodes(relevantExports[0], ts.SyntaxKind.FromKeyword)[0].getStart();

      let insertText = `, ${symbolName}`;

      if (prevExports) {
        insertText = `, ${prevExports.text}${prevExports.coma} ${symbolName}`
      }

      return insertAfterLastOccurrence(exports, insertText, fileToEdit, fallbackPos);
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
  const insertAtBeginning = allExports.length === 0 && useStrict.length === 0;
  const separator = insertAtBeginning ? '' : ';\n';

  let toInsert = `${separator}export *` +
    ` from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;

  if (prevExports) {
    toInsert = `${separator}export ${open}${prevExports.text}${prevExports.coma} ${symbolName}${close}` +
      ` from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;
  }

  if (insertAtBeginning) {
    return new InsertChange(fileToEdit, 0, toInsert);
  }

  return insertAfterLastOccurrence(
    allExports,
    toInsert,
    fileToEdit,
    fallbackPos,
    ts.SyntaxKind.StringLiteral,
  );
}
