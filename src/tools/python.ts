import { tool } from 'ai';
import { z } from 'zod';
import type { GetSandbox, ToolFactory } from '../types.js';

const PYTHON_BOOTSTRAP_PACKAGE = 'openpyxl';
const pythonBootstrapBySandbox = new WeakMap<object, Promise<void>>();

async function ensurePythonPackage(getSandbox: GetSandbox, cwd: string) {
  const sandbox = await getSandbox();
  const sandboxKey = sandbox as object;

  let bootstrap = pythonBootstrapBySandbox.get(sandboxKey);
  if (!bootstrap) {
    bootstrap = (async () => {
      const pythonLookupCommand = [
        'PYTHON_BIN="$(command -v python3 || command -v python)"',
        'if [ -z "$PYTHON_BIN" ]; then echo "Python is not available in this sandbox." >&2; exit 127; fi',
        `"$PYTHON_BIN" -c 'import importlib.util, sys; sys.exit(0 if importlib.util.find_spec("${PYTHON_BOOTSTRAP_PACKAGE}") else 1)'`,
      ].join('; ');

      const lookup = await sandbox.process.executeCommand(pythonLookupCommand, cwd, undefined, 30);

      if (lookup.exitCode === 0) {
        return;
      }

      const installCommand = [
        'PYTHON_BIN="$(command -v python3 || command -v python)"',
        'if [ -z "$PYTHON_BIN" ]; then echo "Python is not available in this sandbox." >&2; exit 127; fi',
        '"$PYTHON_BIN" -m pip --version >/dev/null 2>&1 || "$PYTHON_BIN" -m ensurepip --upgrade >/dev/null 2>&1',
        `"$PYTHON_BIN" -m pip install --disable-pip-version-check --quiet ${PYTHON_BOOTSTRAP_PACKAGE}`,
      ].join('; ');

      const install = await sandbox.process.executeCommand(installCommand, cwd, undefined, 300);
      if (install.exitCode !== 0) {
        throw new Error(
          `Failed to install ${PYTHON_BOOTSTRAP_PACKAGE}: ${install.result.trim() || 'unknown error'}`,
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
      const sandbox = await ensurePythonPackage(getSandbox, _cwd);
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
