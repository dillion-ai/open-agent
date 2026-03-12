import { tool } from 'ai';
import { z } from 'zod';
import { resolvePath } from './utils.js';
import type { GetSandbox, ToolFactory } from '../types.js';

export const createWriteTool: ToolFactory = (getSandbox: GetSandbox, cwd: string) => ({
  write: tool({
    description:
      'Write content to a file in the sandbox. Creates the file if it does not exist, or overwrites it if it does.',
    inputSchema: z.object({
      path: z.string().describe('Path to the file to write'),
      content: z.string().describe('Content to write to the file'),
    }),
    execute: async ({ path, content }) => {
      const sandbox = await getSandbox();
      const resolved = resolvePath(path, cwd);
      await sandbox.fs.uploadFile(Buffer.from(content, 'utf-8'), resolved);
      return { path: resolved, bytesWritten: Buffer.byteLength(content, 'utf-8') };
    },
  }),
});
