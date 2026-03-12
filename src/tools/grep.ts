import { tool } from 'ai';
import { z } from 'zod';
import { resolvePath } from './utils.js';
import type { GetSandbox, ToolFactory } from '../types.js';

export const createGrepTool: ToolFactory = (getSandbox: GetSandbox, cwd: string) => ({
  grep: tool({
    description:
      'Search file contents for a pattern using grep. Returns matching lines with file paths and line numbers.',
    inputSchema: z.object({
      pattern: z.string().describe('Regular expression pattern to search for'),
      path: z
        .string()
        .optional()
        .describe('Directory or file to search in (defaults to working directory)'),
      include: z
        .string()
        .optional()
        .describe('Glob pattern to filter files (e.g. "*.ts")'),
    }),
    execute: async ({ pattern, path, include }) => {
      const sandbox = await getSandbox();
      const searchPath = resolvePath(path ?? '.', cwd);

      let cmd = `grep -rn '${pattern.replace(/'/g, "'\\''")}' '${searchPath}'`;
      if (include) {
        cmd += ` --include='${include}'`;
      }
      cmd += ' 2>/dev/null || true';

      const response = await sandbox.process.executeCommand(cmd, cwd, undefined, 30);
      const lines = response.result.trim().split('\n').filter(Boolean);
      return {
        matches: lines.slice(0, 100),
        totalMatches: lines.length,
        truncated: lines.length > 100,
      };
    },
  }),
});
