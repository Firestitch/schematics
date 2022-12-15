import * as ts from 'typescript';
import { Change, InsertChange } from './change';
import { findNodes, insertAfterLastOccurrence } from './ast-utils';
import { insertImport } from './route-utils';

export function insertImplements(
  source: ts.SourceFile,
  filePath: string,
  name: string,
  importFrom?: string,
): Change[] {
  const changes: Change[] = [];

  const implementsNodes = findNodes(source as any, ts.SyntaxKind.HeritageClause)
    .filter((node: any) => node.token === ts.SyntaxKind.ImplementsKeyword);

  if (implementsNodes.length) { // Case when class already has "implements" definition

    if (implementsNodes.length > 1) {
      throw new Error(`[insertImplements] More than one implements keyword found in a file ${filePath}`);
    }

    const alreadyImplemented = (implementsNodes[0] as any).types.some((type) => type.expression?.text === 'OnDestroy')

    if (!alreadyImplemented) {
      changes.push(
        insertAfterLastOccurrence(implementsNodes, `, ${name}`, filePath, 0),
      );
    }
  } else { // Case when "implements" must be defined from scratch
    const classesDeclarations = findNodes(source as any, ts.SyntaxKind.ClassDeclaration);

    if (classesDeclarations.length) {
      if (classesDeclarations.length > 1) {
        throw new Error(`[insertImplements] More than one class declaration found in a file ${filePath}`);
      }

      const f = classesDeclarations[0]
        .getChildren()
        .filter((node) => node.kind === ts.SyntaxKind.OpenBraceToken);

      const insertPosition = f[0].pos;
      changes.push(
        new InsertChange(filePath, insertPosition, ` implements ${name}`)
      );
    }
  }

  if (importFrom && changes.length) {
    changes.push(
      insertImport(
        source as any,
        filePath,
        name,
        importFrom,
        false,
      )
    )
  }

  return changes;

}
