import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTools } from '../dist/index.js';

test('python tool bootstraps openpyxl once per sandbox', async () => {
  let bootstrapCalls = 0;
  let userCodeCalls = 0;

  const sandbox = {
    process: {},
    codeInterpreter: {
      runCode: async (code, options) => {
        if (code.includes('import openpyxl') && code.includes('subprocess.run')) {
          bootstrapCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 25));
          return { stdout: '', stderr: '' };
        }
        userCodeCalls += 1;
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
  assert.equal(bootstrapCalls, 1);
  assert.equal(userCodeCalls, 2);
});
