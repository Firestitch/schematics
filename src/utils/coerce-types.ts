export function coerceTypes<T extends any>(target: T): T {
  return Object.keys(target)
    .reduce((acc: any, key) => {
      let value = target[key];

      if (value === 'true' || value === 'false') {
        value = value === 'true';
      } else if (!isNaN(parseInt(value, 10))) {
        value = parseInt(value as string, 10);
      } else if (value === 'undefined') {
        value = undefined;
      } else if (value === 'null') {
        value = null;
      }

      acc[key] = value;

      return acc;
    }, {});
}
