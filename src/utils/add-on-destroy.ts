import { Rule, Tree } from '@angular-devkit/schematics';
import { getSource } from './create-source';
import { insertImplements } from './insert-implements';
import { insertChanges } from './insert-changes';
import { insertDestroyDeclaration, insertNgOnDestroy } from './ast-utils';
import { insertImport } from './route-utils';

export function addOnDestroy(options: any): Rule {
  return (host: Tree) => {
    const source = getSource(host, options.path);

    const changes = [];
    changes.push(...insertImplements(source, options.path, 'OnDestroy', '@angular/core'));
    changes.push(insertNgOnDestroy(source, options.path));
    changes.push(insertDestroyDeclaration(source));
    changes.push(insertImport(
      source,
      options.path || '',
      `Subject`,
      'rxjs',
      false,
    ))

    insertChanges(host, options.path, changes);

    return host;
  };
}
