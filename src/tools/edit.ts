import { tool } from 'ai';
import { z } from 'zod';
import { resolvePath } from './utils.js';
import type { GetSandbox, ToolFactory } from '../types.js';

export const createEditTool: ToolFactory = (getSandbox: GetSandbox, cwd: string) => ({
  edit: tool({
    description:
      'Edit a file by replacing an exact string match with new content. The old_string must appear exactly once in the file.',
    inputSchema: z.object({
      path: z.string().describe('Path to the file to edit'),
      old_string: z.string().describe('The exact string to find and replace'),
      new_string: z.string().describe('The replacement string'),
    }),
    execute: async ({ path, old_string, new_string }) => {
      const sandbox = await getSandbox();
      const resolved = resolvePath(path, cwd);

      const buffer = await sandbox.fs.downloadFile(resolved);
      const content = buffer.toString('utf-8');

      const occurrences = content.split(old_string).length - 1;
      if (occurrences === 0) {
        return { error: 'old_string not found in file' };
      }
      if (occurrences > 1) {
        return {
          error: `old_string found ${occurrences} times — must be unique. Provide more surrounding context.`,
        };
      }

      const updated = content.replace(old_string, new_string);
      await sandbox.fs.uploadFile(Buffer.from(updated, 'utf-8'), resolved);
      return { path: resolved, edited: true };
    },
  }),
});
