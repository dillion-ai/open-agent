import { tool } from 'ai';
import { z } from 'zod';
import type { GetSandbox, ToolFactory } from '../types.js';

export const createPythonTool: ToolFactory = (getSandbox: GetSandbox, _cwd: string) => ({
  python: tool({
    description:
      'Execute Python code directly in the sandbox runtime. Use this instead of bash for running Python — it avoids shell escaping issues. Supports pandas, openpyxl, and other installed packages. Stdout is captured and returned.',
    inputSchema: z.object({
      code: z.string().describe('The Python code to execute'),
      timeout: z
        .number()
        .optional()
        .describe('Timeout in seconds (default: 120)'),
    }),
    execute: async ({ code, timeout }) => {
      const sandbox = await getSandbox();
      const result = await sandbox.codeInterpreter.runCode(code, {
        timeout: timeout ?? 120,
      });
      const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
      return {
        result: result.error
          ? `${output ? output + '\n\n' : ''}[Python error] ${result.error.name}: ${result.error.value}${result.error.traceback ? '\n' + result.error.traceback : ''}`
          : output || '(no output)',
        exitCode: result.error ? 1 : 0,
      };
    },
  }),
});
