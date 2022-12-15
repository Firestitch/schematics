import { Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from './change';


export function insertChanges(host: Tree, path: string, changes: Change[]): void {
  const declarationRecorder = host.beginUpdate(path);

  for (const change of changes) {
    if (change instanceof InsertChange) {
      declarationRecorder.insertLeft(change.pos, change.toAdd);
    }
  }

  host.commitUpdate(declarationRecorder);
}
