import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { WorkspaceDefinition } from '@angular-devkit/core/src/workspace';

import { getWorkspacePath } from './get-workspace-path';


export function getWorkspace(host: Tree): WorkspaceDefinition {
  const path = getWorkspacePath(host);
  const configBuffer = host.read(path);
  if (configBuffer === null) {
    throw new SchematicsException(`Could not find (${path})`);
  }
  const config = configBuffer.toString();

  return JSON.parse(config);
}
