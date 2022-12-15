import { SchematicsException, Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { findNodes } from './ast-utils';

export function getServiceClassName(host: Tree, servirePath: string) {
  const source = createServiceClassContext(host, servirePath);

  const declarations = findNodes(source, ts.SyntaxKind.ClassDeclaration) as any;

  return declarations.length > 0
    ? declarations[0].name.text
    : null;
}

export function createServiceClassContext(host: Tree, servirePath: string) {
  const text = host.read(servirePath);

  if (text === null) {
    throw new SchematicsException(`File ${servirePath} does not exist!`);
  }
  const sourceText = text.toString('utf-8');
  return ts.createSourceFile(servirePath, sourceText, ts.ScriptTarget.Latest, true);
}
