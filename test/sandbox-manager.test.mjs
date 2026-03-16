import test from 'node:test';
import assert from 'node:assert/strict';
import { Daytona } from '@daytonaio/sdk';
import { createSandboxManager } from '../dist/index.js';

test('createSandboxManager deduplicates concurrent creation and cleans up once', async () => {
  const originalCreate = Daytona.prototype.create;
  const originalDelete = Daytona.prototype.delete;

  let createCalls = 0;
  let deleteCalls = 0;
  const sandbox = { id: 'sandbox-1' };

  Daytona.prototype.create = async function () {
    createCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));
    return sandbox;
  };

  Daytona.prototype.delete = async function (createdSandbox) {
    deleteCalls += 1;
    assert.equal(createdSandbox, sandbox);
  };

  try {
    const manager = createSandboxManager({ apiKey: 'test-key' });

    const [first, second, third] = await Promise.all([
      manager.getSandbox(),
      manager.getSandbox(),
      manager.getSandbox(),
    ]);

    assert.equal(first, sandbox);
    assert.equal(second, sandbox);
    assert.equal(third, sandbox);
    assert.equal(createCalls, 1);

    await manager.cleanup();
    assert.equal(deleteCalls, 1);
  } finally {
    Daytona.prototype.create = originalCreate;
    Daytona.prototype.delete = originalDelete;
  }
});
