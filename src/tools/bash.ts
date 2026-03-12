import { tool } from 'ai';
import { z } from 'zod';
import type { GetSandbox, ToolFactory } from '../types.js';

export const createBashTool: ToolFactory = (getSandbox: GetSandbox, cwd: string) => ({
  bash: tool({
    description:
      'Execute a shell command in the sandbox. Use this for running programs, installing packages, or any shell operation.',
    inputSchema: z.object({
      command: z.string().describe('The shell command to execute'),
      timeout: z
        .number()
        .optional()
        .describe('Timeout in seconds (default: 120)'),
    }),
    execute: async ({ command, timeout }) => {
      const sandbox = await getSandbox();
      const response = await sandbox.process.executeCommand(command, cwd, undefined, timeout ?? 120);
      return {
        stdout: response.result,
        exitCode: response.exitCode,
      };
    },
  }),
});
