import { branchAndMerge, chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
// import { getWorkspace } from 'schematics-utilities';

import { coerceTypes } from '../utils/coerce-types';
import { IOndestroyOptions } from './ondestroy-options.interface';
import { addOnDestroy } from '../utils/add-on-destroy';

export function onDestroy(_options: IOndestroyOptions): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    // const workspace = getWorkspace(tree);
    const options: IOndestroyOptions = coerceTypes(_options);

    const rule = chain([
      branchAndMerge(chain([
        addOnDestroy(options),
      ]))
    ]);

    return rule(tree, _context);
  };
}
