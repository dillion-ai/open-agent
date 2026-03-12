import { tool } from 'ai';
import { z } from 'zod';
import { resolvePath } from './utils.js';
import type { GetSandbox, ToolFactory } from '../types.js';

export const createReadTool: ToolFactory = (getSandbox: GetSandbox, cwd: string) => ({
  read: tool({
    description:
      'Read the contents of a file from the sandbox. Returns the file content as text.',
    inputSchema: z.object({
      path: z.string().describe('Path to the file to read'),
      offset: z
        .number()
        .optional()
        .describe('Line number to start reading from (1-based)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of lines to read'),
    }),
    execute: async ({ path, offset, limit }) => {
      const sandbox = await getSandbox();
      const resolved = resolvePath(path, cwd);
      const buffer = await sandbox.fs.downloadFile(resolved);
      let content = buffer.toString('utf-8');

      if (offset !== undefined || limit !== undefined) {
        const lines = content.split('\n');
        const start = (offset ?? 1) - 1;
        const end = limit !== undefined ? start + limit : lines.length;
        content = lines.slice(start, end).join('\n');
      }

      return { content };
    },
  }),
});
