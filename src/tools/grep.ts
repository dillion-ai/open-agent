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

      // Write pattern to a temp file to avoid shell injection
      const patternFile = '/tmp/.grep_pattern_' + Date.now();
      await sandbox.fs.uploadFile(Buffer.from(pattern, 'utf-8'), patternFile);

      let cmd = `grep -rn -f ${patternFile} '${searchPath.replace(/'/g, "'\\''")}'`;
      if (include) {
        cmd += ` --include='${include.replace(/'/g, "'\\''")}'`;
      }
      cmd += ` 2>/dev/null; rm -f ${patternFile}`;

      const response = await sandbox.process.executeCommand(cmd, cwd, undefined, 30);
      const lines = response.result.trim().split('\n').filter(Boolean);
      const truncated = lines.length > 100;
      return {
        matches: lines.slice(0, 100),
        totalMatches: lines.length,
        truncated,
        ...(truncated ? { warning: `Results truncated: showing 100 of ${lines.length} matches. Narrow your search pattern or path.` } : {}),
      };
    },
  }),
});
