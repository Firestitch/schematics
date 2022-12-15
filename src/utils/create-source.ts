import { SchematicsException, Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';

export function getSource(host: Tree, path: string): ts.SourceFile {
  const text = host.read(path);

  if (text === null) {
    throw new SchematicsException(`File ${path} does not exist.`);
  }

  const sourceText = text.toString('utf-8');
  return ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true);

}
