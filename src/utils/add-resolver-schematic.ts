import { schematic } from '@angular-devkit/schematics';

export function addResolverSchematic(options) {
  const childSchematicOptions = {
    project: options.project,
    path: options.path,
    module: options.module,
    name: options.singleModel,
    service: options.service,
    servicePath: options.servicePath,
  };


  return schematic(
    'resolve',
    childSchematicOptions
  );
}
