import { buildRelativePath } from './find-module';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { Tree } from '@angular-devkit/schematics';

/**
 * Build right services's path for correct component
 * @param options
 * @returns {string}
 */
export function buildRelativePathForService(options): string {
  const isDataServiceRegexp = /\.data\.ts$/;
  const isDataServiceCorePathRegexp = /\/core\//;

  if (
    isDataServiceRegexp.test(options.service)
    && isDataServiceCorePathRegexp.test(options.servicePath)
  ) {
    return '@app/core';
  } else {
    return buildRelativePath(
      `${options.componentPath}/${dasherize(options.name)}/${dasherize(options.name)}.component.ts`,
      `${options.servicePath}/${options.service}`
    ).replace('.ts', '');
  }
}

/**
 * Build right services's path for correct component
 * @param options
 * @returns {string}
 */
export function buildRelativePathForEnum(options): string {
  return buildRelativePath(
    `${options.componentPath}/${dasherize(options.name)}.const.ts`,
    `${options.enumPath}`
  ).replace('.ts', '');
}

/**
 * Get index.ts file position for component
 * It can be module's root or /components folder (if it exists)
 * @param {Tree} tree
 * @param options
 * @returns {{path}}
 */
export function getRootPath(tree: Tree, options): { path: string } {
  const dir = tree.getDir(`${options.path}`);

  if (options.type && options.type === 'view') {
    const isViewsFolderExists = (dir.subdirs as string[]).indexOf('views') !== -1;
    const path = options.path + ( isViewsFolderExists ? '/views' : '');

    return { path };
  } else {
    const isComponentFolderExists = (dir.subdirs as string[]).indexOf('components') !== -1;
    const path = options.path + ( isComponentFolderExists ? '/components' : '');

    return { path };
  }
}

/**
 * Get current component's location (include nestedPath)
 * @param path
 * @param routable
 * @returns {{path}}
 */
export function getComponentPath(path: string, routable: string | boolean): string {

  if (routable === 'true' || routable === true) {
    path += '/views';
  } else {
    path += '/components';
  }

  return path ;
}
