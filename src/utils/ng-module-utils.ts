// Option A: Directly referencing the private APIs
// import { ModuleOptions, buildRelativePath } from "@schematics/angular/utility/find-module";
// import { Rule, Tree, SchematicsException } from "@angular-devkit/schematics";
// import { dasherize, classify } from "@angular-devkit/core";
// import { addDeclarationToModule, addExportToModule } from "@schematics/angular/utility/ast-utils";
// import { InsertChange } from "@schematics/angular/utility/change";
// Option B: Using a fork of the private APIs b/c they can change
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { AddToModuleContext } from './add-to-module-context';
import * as ts from 'typescript';
import { normalize, strings } from '@angular-devkit/core';
// Referencing forked and copied private APIs
import { buildRelativePath, ModuleOptions } from './find-module';
import {
  addDeclarationToModule,
  addEntryComponentToModule,
  addExportToModule,
  addImportToModule,
  addProviderToModule,
  addSymbolToNgModuleRoutingMetadata
} from './ast-utils';
import { InsertChange } from './change';
import { OptionsInterface } from './models/';
import { insertImport } from './route-utils';
import { insertExport } from './insert-export';

const { dasherize, classify } = strings;

const stringUtils = { dasherize, classify };

export function addDeclarationToNgModule(options: ModuleOptions, exports: boolean): Rule {
  return (host: Tree) => {
    addDeclaration(host, options);
    if (exports) {
      addExport(host, options);
    }
    return host;
  };
}

export function addExportsToNgModule(options: ModuleOptions, exports: boolean): Rule {
  return (host: Tree) => {
    addDeclaration(host, options);
    if (exports) {
      addExport(host, options);
    }
    return host;
  };
}

export function addModuleDeclarationToNgModule(options: ModuleOptions): Rule {
  return (host: Tree) => {
    addModuleDeclaration(host, options);
    return host;
  }
}

export function importModulesToNgModule(options: ModuleOptions, imports: string[][]): Rule {
  return (host: Tree) => {
    importModules(host, options, imports);
    return host;
  }
}

export function addEntryComponentDeclarationToNgModule(options: ModuleOptions, exports: boolean): Rule {
  return (host: Tree) => {
    addEntryComponentDeclaration(host, options);
    return host;
  };
}

export function addDeclarationToRoutingModule(options: ModuleOptions): Rule {
  return (host: Tree) => {
    addRoutingDeclaration(host, options);
    return host;
  };
}

export function addServiceProviderToNgModule(options: OptionsInterface): Rule {
  return (host: Tree) => {
    addServiceDeclaration(host, options);
    return host;
  }
}

export function addResolveDeclarationToNgModule(options: OptionsInterface): Rule {
  return (host: Tree) => {
    addResolveDeclaration(host, options);
    return host;
  }
}

export function addResolverToRouting(options: ModuleOptions): Rule {
  return (host: Tree) => {
    addResolverDeclarationRouting(host, options);
    return host;
  }
}

function createAddToModuleContext(host: Tree, options: ModuleOptions): AddToModuleContext {
  const result = new AddToModuleContext();

  if (!options.module) {
    throw new SchematicsException(`Module not found.`);
  }

  const text = host.read(options.module);

  if (text === null) {
    throw new SchematicsException(`File ${options.module} does not exist!`);
  }
  const sourceText = text.toString('utf-8');
  result.source = ts.createSourceFile(options.module, sourceText, ts.ScriptTarget.Latest, true);

  let hasIndexExportsFile = false;
  let componentPath;

  const isParentIndexExists = host.exists(`${options.path}/index.ts`);

  const indexPath = `${options.componentPath}/${stringUtils.dasherize(options.name)}/index.ts`;
  const isIndexExists = host.exists(indexPath);
  if (isIndexExists) {
    const fileContent = host.read(indexPath);

    if (fileContent && fileContent.indexOf(`${stringUtils.dasherize(options.name)}.component`)) {
      hasIndexExportsFile = true
    }
  }

  if (isParentIndexExists) {
    componentPath = options.componentPath + '/index.ts'
  } else if (hasIndexExportsFile) {
    componentPath = `${options.componentPath}/`
      + stringUtils.dasherize(options.name)
  } else {
    componentPath = `${options.componentPath}/`
      + stringUtils.dasherize(options.name) + '/'
      + stringUtils.dasherize(options.name)
      + '.component';
  }

  result.relativePath = buildRelativePath(options.module, componentPath);
  if (result.relativePath.endsWith('/index.ts')) {
    result.relativePath = result.relativePath.replace('/index.ts', '');
  }
  result.classifiedName = stringUtils.classify(`${options.name}Component`);

  return result;
}

function createServiceToModuleContext(host: Tree, options: OptionsInterface): AddToModuleContext {
  const result = new AddToModuleContext();

  if (!options.module) {
    throw new SchematicsException(`Module not found.`);
  }

  const text = host.read(options.module);

  if (text === null) {
    throw new SchematicsException(`File ${options.module} does not exist!`);
  }
  const sourceText = text.toString('utf-8');
  result.source = ts.createSourceFile(options.module, sourceText, ts.ScriptTarget.Latest, true);

  let hasIndexExportsFile = false;

  host
    .getDir(`${options.path}`)
    .visit(filePath => {
      if (filePath.indexOf('index.ts') > -1) {
        const fileContent = host.read(filePath);
        if (fileContent && fileContent.indexOf(`${stringUtils.dasherize(options.name)}.service`)) {
          hasIndexExportsFile = true
        }
      }
    });


  // @todo !!!
  // if (hasIndexExportsFile) {
    options.componentPath = `${options.path}/`;
  // } else {
  //   componentPath = `${options.path}${options.subdirectory}/`
  //     + stringUtils.dasherize(options.name)
  //     + '.service';
  // }

  result.relativePath = buildRelativePath(`${options.module}`, options.componentPath);
  result.classifiedName = stringUtils.classify(options.name);

  if (options.type === 'service') {
    result.classifiedName += 'Service';
  } else {
    result.classifiedName += 'Data';
  }

  return result;
}

function createResolverToRoutingContext(host: Tree, options: ModuleOptions) {
  if (!options.routingModule) {
    throw new SchematicsException(`RoutingModule not found.`);
  }

  const result = new AddToModuleContext();

  const text = host.read(options.routingModule);

  if (text === null) {
    throw new SchematicsException(`File Fuck does not exist!`);
  }
  const sourceText = text.toString('utf-8');
  result.source = ts.createSourceFile(options.routingModule, sourceText, ts.ScriptTarget.Latest, true);

  const resolverPath = options.componentPath;
  result.relativePath = buildRelativePath(options.module || '', resolverPath);
  result.classifiedName = stringUtils.classify(`${options.name}Resolve`);
  return result;
}

function createResolverToModuleContext(host: Tree, options: ModuleOptions) {
  if (!options.module) {
    throw new SchematicsException(`Module not found.`);
  }

  const result = new AddToModuleContext();

  const text = host.read(options.module);

  if (text === null) {
    throw new SchematicsException(`File ${options.module} does not exist!`);
  }
  const sourceText = text.toString('utf-8');
  result.source = ts.createSourceFile(options.module, sourceText, ts.ScriptTarget.Latest, true);

  const resolverPath = options.componentPath;
  result.relativePath = buildRelativePath(options.module || '', resolverPath);
  result.classifiedName = stringUtils.classify(`${options.name}Resolve`);
  return result;
}


function readTest(host: Tree, options: ModuleOptions) {
  if (!options.routingModule) {
    throw new SchematicsException(`RoutingModule not found.`);
  }

  const result = new AddToModuleContext();

  const text = host.read(options.routingModule);

  if (text === null) {
    throw new SchematicsException(`File ${options.routingModule} does not exist!`);
  }
  const sourceText = text.toString('utf-8');
  result.source = ts.createSourceFile(options.routingModule, sourceText, ts.ScriptTarget.Latest, true);

  let hasIndexExportsFile = false;
  let componentPath;

  const isParentIndexExists = host.exists(`${options.path}/index.ts`);

  const indexPath = `${options.componentPath}/${stringUtils.dasherize(options.name)}/index.ts`;
  const isIndexExists = host.exists(indexPath);
  if (isIndexExists) {
    const fileContent = host.read(indexPath);

    if (fileContent && fileContent.indexOf(`${stringUtils.dasherize(options.name)}.component`)) {
      hasIndexExportsFile = true
    }
  }

  if (isParentIndexExists) {
    componentPath = options.componentPath + '/index.ts'
  } else if (hasIndexExportsFile) {
    componentPath = `${options.componentPath}/`
      + stringUtils.dasherize(options.name)
  } else {
    componentPath = `${options.componentPath}/`
      + stringUtils.dasherize(options.name) + '/'
      + stringUtils.dasherize(options.name)
      + '.component';
  }

  result.relativePath = buildRelativePath(options.module || '', componentPath);
  if (result.relativePath.endsWith('/index.ts')) {
    result.relativePath = result.relativePath.replace('/index.ts', '');
  }

  result.classifiedName = stringUtils.classify(`${options.name}Component`);
  return result;
}

function createAddSecondLevelToModuleContext(host: Tree, options: ModuleOptions): AddToModuleContext {
  const result = createAddToModuleContext(host, options);

  result.classifiedName = stringUtils.classify(`${options.name} Component`);

  return result;

}

function addDeclaration(host: Tree, options: ModuleOptions) {
  const context = !options.secondLevel
    ? createAddToModuleContext(host, options)
    : createAddSecondLevelToModuleContext(host, options);

  const modulePath = options.module || '';

  const declarationChanges = addDeclarationToModule(
    context.source,
    modulePath,
    context.classifiedName,
    context.relativePath
  );

  const declarationRecorder = host.beginUpdate(modulePath);
  for (const change of declarationChanges) {
    if (change instanceof InsertChange) {
      declarationRecorder.insertLeft(change.pos, change.toAdd);
    }
  }
  host.commitUpdate(declarationRecorder);
}

function addEntryComponentDeclaration(host: Tree, options: ModuleOptions) {
  const context = !options.secondLevel
    ? createAddToModuleContext(host, options)
    : createAddSecondLevelToModuleContext(host, options);

  const modulePath = options.module || '';

  const declarationChanges = addEntryComponentToModule(
    context.source,
    modulePath,
    context.classifiedName,
    context.relativePath
  );

  const declarationRecorder = host.beginUpdate(modulePath);
  for (const change of declarationChanges) {
    if (change instanceof InsertChange) {
      declarationRecorder.insertLeft(change.pos, change.toAdd);
    }
  }
  host.commitUpdate(declarationRecorder);
}

function addServiceDeclaration(host: Tree, options: OptionsInterface) {
  const context = createServiceToModuleContext(host, options);
  const modulePath = options.module || '';

  const declarationChanges = addProviderToModule(
    context.source,
    modulePath,
    context.classifiedName,
    context.relativePath
  );

  const declarationRecorder = host.beginUpdate(modulePath);
  for (const change of declarationChanges) {
    if (change instanceof InsertChange) {
      declarationRecorder.insertLeft(change.pos, change.toAdd);
    }
  }
    host.commitUpdate(declarationRecorder);
}

function addResolveDeclaration(host: Tree, options: OptionsInterface) {
  const context = createResolverToModuleContext(host, options);
  const modulePath = options.module || '';

  const declarationChanges = addProviderToModule(
    context.source,
    modulePath,
    context.classifiedName,
    context.relativePath
  );

  const declarationRecorder = host.beginUpdate(modulePath);
  for (const change of declarationChanges) {
    if (change instanceof InsertChange) {
      declarationRecorder.insertLeft(change.pos, change.toAdd);
    }
  }
  host.commitUpdate(declarationRecorder);
}

function addResolverDeclarationRouting(host: Tree, options: OptionsInterface) {
  const context = createResolverToRoutingContext(host, options);

  const routingModulePath = options.routingModule || '';

  const declarationChanges = [insertImport(
    context.source,
    routingModulePath,
    context.classifiedName,
    context.relativePath,
    false
  )];

  if (routingModulePath) {
    const declarationRecorder = host.beginUpdate(routingModulePath);
    for (const change of declarationChanges) {
      if (change instanceof InsertChange) {
        declarationRecorder.insertLeft(change.pos, change.toAdd);
      }
    }
    host.commitUpdate(declarationRecorder);
  }
}

function addModuleDeclaration(host: Tree, options: ModuleOptions) {
  const modulePath = options.path + '/' + options.module;

  const text = host.read(modulePath);
  if (text === null) {
    throw new SchematicsException(`File ${modulePath} does not exist.`);
  }
  const sourceText = text.toString('utf-8');
  const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

  const importModulePath = normalize(
    `/${options.path}/`
    + strings.dasherize(options.name) + '/'
    + strings.dasherize(options.name)
    + '.module',
  );

  const relativePath = buildRelativePath(modulePath, importModulePath);
  const changes = addImportToModule(source,
    modulePath,
    strings.classify(`${options.name}Module`),
    relativePath);

  const recorder = host.beginUpdate(modulePath);
  for (const change of changes) {
    if (change instanceof InsertChange) {
      recorder.insertLeft(change.pos, change.toAdd);
    }
  }
  host.commitUpdate(recorder);
}

function importModules(host: Tree, options: ModuleOptions, modulesToImport: string[][]) {
  const modulePath = options.module;

  const text = host.read(modulePath);
  if (text === null) {
    throw new SchematicsException(`File ${modulePath} does not exist.`);
  }
  const sourceText = text.toString('utf-8');
  const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

  const changes = [];

  modulesToImport.forEach((importTarget) => {
    const change = addImportToModule(
      source,
      modulePath,
      importTarget[0],
      importTarget[1]
    );

    changes.push(...change);
  });

  const recorder = host.beginUpdate(modulePath);
  for (const change of changes) {
    if (change instanceof InsertChange) {
      recorder.insertLeft(change.pos, change.toAdd);
    }
  }
  host.commitUpdate(recorder);
}


function addRoutingDeclaration(host: Tree, options: ModuleOptions) {
  const context = readTest(host, options);

  const routingChanges = addSymbolToNgModuleRoutingMetadata(
    context.source,
    options.routingModule || '',
    context.classifiedName,
    context.relativePath,
    options
  );

  if (options.routingModule) {
    const declarationRecorder = host.beginUpdate(options.routingModule);
    for (const change of routingChanges) {
      if (change instanceof InsertChange) {
        declarationRecorder.insertLeft(change.pos, change.toAdd);
      }
    }
    host.commitUpdate(declarationRecorder);
  }
}


function addExport(host: Tree, options: ModuleOptions) {
  const context = createAddToModuleContext(host, options);
  const modulePath = options.module || '';

  const exportChanges = addExportToModule(
    context.source,
    modulePath,
    context.classifiedName,
    context.relativePath);

  const exportRecorder = host.beginUpdate(modulePath);

  for (const change of exportChanges) {
    if (change instanceof InsertChange) {
      exportRecorder.insertLeft(change.pos, change.toAdd);
    }
  }
  host.commitUpdate(exportRecorder);
}


