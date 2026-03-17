import { tool } from 'ai';
import { z } from 'zod';
import type { GetSandbox, ToolFactory } from '../types.js';

const PYTHON_BOOTSTRAP_PACKAGE = 'openpyxl';
const pythonBootstrapBySandbox = new WeakMap<object, Promise<void>>();

const BOOTSTRAP_CODE = `
import subprocess
import sys
try:
    import openpyxl
except ImportError:
    subprocess.run([sys.executable, '-m', 'pip', 'install', '--disable-pip-version-check', '--quiet', 'openpyxl'], check=True)
`;

async function ensurePythonPackage(getSandbox: GetSandbox) {
  const sandbox = await getSandbox();
  const sandboxKey = sandbox as object;

  let bootstrap = pythonBootstrapBySandbox.get(sandboxKey);
  if (!bootstrap) {
    bootstrap = (async () => {
      const result = await sandbox.codeInterpreter.runCode(BOOTSTRAP_CODE, { timeout: 120 });
      if (result.error) {
        throw new Error(
          `Failed to bootstrap ${PYTHON_BOOTSTRAP_PACKAGE}: ${result.error.name}: ${result.error.value}${result.error.traceback ? '\n' + result.error.traceback : ''}`,
        );
      }
    })().catch((error) => {
      pythonBootstrapBySandbox.delete(sandboxKey);
      throw error;
    });

    pythonBootstrapBySandbox.set(sandboxKey, bootstrap);
  }

  await bootstrap;
  return sandbox;
}

export const createPythonTool: ToolFactory = (getSandbox: GetSandbox, _cwd: string) => ({
  python: tool({
    description:
      'Execute Python code directly in the sandbox runtime. Use this instead of bash for running Python — it avoids shell escaping issues. It bootstraps openpyxl on first use when needed. Stdout is captured and returned.',
    inputSchema: z.object({
      code: z.string().describe('The Python code to execute'),
      timeout: z
        .number()
        .optional()
        .describe('Timeout in seconds (default: 120)'),
    }),
    execute: async ({ code, timeout }) => {
      const sandbox = await ensurePythonPackage(getSandbox);
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
