import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTools } from '../dist/index.js';

test('python tool bootstraps openpyxl once per sandbox', async () => {
  let lookupCalls = 0;
  let installCalls = 0;
  let runCodeCalls = 0;

  const sandbox = {
    process: {
      executeCommand: async (command, cwd) => {
        assert.equal(cwd, '/home/daytona');

        if (command.includes('importlib.util.find_spec("openpyxl")')) {
          lookupCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 25));
          return { exitCode: 1, result: '' };
        }

        if (command.includes('pip install') && command.includes('openpyxl')) {
          installCalls += 1;
          return { exitCode: 0, result: '' };
        }

        throw new Error(`Unexpected command: ${command}`);
      },
    },
    codeInterpreter: {
      runCode: async (code, options) => {
        runCodeCalls += 1;
        assert.equal(code, 'print("ok")');
        assert.equal(options.timeout, 30);
        return { stdout: 'ok', stderr: '' };
      },
    },
  };

  const tools = resolveTools(['python'], async () => sandbox, '/home/daytona');

  const [first, second] = await Promise.all([
    tools.python.execute({ code: 'print("ok")', timeout: 30 }),
    tools.python.execute({ code: 'print("ok")', timeout: 30 }),
  ]);

  assert.deepEqual(first, { result: 'ok', exitCode: 0 });
  assert.deepEqual(second, { result: 'ok', exitCode: 0 });
  assert.equal(lookupCalls, 1);
  assert.equal(installCalls, 1);
  assert.equal(runCodeCalls, 2);
});
