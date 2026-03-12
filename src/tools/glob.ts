import { tool } from 'ai';
import { z } from 'zod';
import { resolvePath } from './utils.js';
import type { GetSandbox, ToolFactory } from '../types.js';

export const createGlobTool: ToolFactory = (getSandbox: GetSandbox, cwd: string) => ({
  glob: tool({
    description:
      'Search for files matching a glob pattern in the sandbox. Returns a list of matching file paths.',
    inputSchema: z.object({
      pattern: z.string().describe('Glob pattern to match (e.g. "**/*.ts", "src/**/*.js")'),
      path: z
        .string()
        .optional()
        .describe('Directory to search in (defaults to working directory)'),
    }),
    execute: async ({ pattern, path }) => {
      const sandbox = await getSandbox();
      const searchPath = resolvePath(path ?? '.', cwd);
      const result = await sandbox.fs.searchFiles(searchPath, pattern);
      return { files: result.files ?? [] };
    },
  }),
});
