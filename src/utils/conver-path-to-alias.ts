export function converPathToAlias(path: string): string {
  if (path.match(/^(\.+\/)+(core|app\/core).+$/gi)) {
    return path.replace(/(\.+\/)+(core|app\/core)/, '@app/core');
  }

  return path;
}
