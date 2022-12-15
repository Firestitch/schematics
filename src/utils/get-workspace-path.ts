import { Tree } from '@angular-devkit/schematics';

export function getWorkspacePath(host: Tree): string {
  const possibleFiles = [ '/angular.json', '/.angular.json', '/workspace.json' ];
  return possibleFiles.filter(path => host.exists(path))[0];
}
