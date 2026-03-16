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
      // Capture stderr to a temp file so we can return it separately
      const stderrFile = `/tmp/.stderr_${Date.now()}`;
      const wrappedCmd = `{ ${command} ; } 2>${stderrFile}; __ec=$?; echo "---STDERR_MARKER---"; cat ${stderrFile} 2>/dev/null; rm -f ${stderrFile}; exit $__ec`;
      const response = await sandbox.process.executeCommand(wrappedCmd, cwd, undefined, timeout ?? 120);
      const marker = '---STDERR_MARKER---';
      const markerIdx = response.result.indexOf(marker);
      let stdout = response.result;
      let stderr = '';
      if (markerIdx !== -1) {
        stdout = response.result.slice(0, markerIdx).replace(/\n$/, '');
        stderr = response.result.slice(markerIdx + marker.length + 1).trim();
      }
      return {
        stdout,
        stderr,
        exitCode: response.exitCode,
      };
    },
  }),
});
