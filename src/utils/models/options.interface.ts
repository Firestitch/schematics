import { ModuleOptions } from '../find-module';

export interface OptionsInterface extends ModuleOptions {
  subdirectory?: string;
  singleModel?: string;
  type?: string;
}
