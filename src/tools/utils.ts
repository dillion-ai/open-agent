import { posix } from 'node:path';

export function resolvePath(path: string, cwd: string): string {
  if (posix.isAbsolute(path)) return path;
  return posix.join(cwd, path);
}
