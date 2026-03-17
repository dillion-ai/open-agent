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

test('createSandboxManager passes snapshot name when configured', async () => {
  const originalCreate = Daytona.prototype.create;
  const sandbox = { id: 'sandbox-snapshot' };
  let createArgs;

  Daytona.prototype.create = async function (params, options) {
    createArgs = { params, options };
    return sandbox;
  };

  try {
    const manager = createSandboxManager({
      apiKey: 'test-key',
      snapshot: 'python-tools',
      language: 'python',
    });

    const created = await manager.getSandbox();
    assert.equal(created, sandbox);
    assert.deepEqual(createArgs, {
      params: { snapshot: 'python-tools', language: 'python' },
      options: undefined,
    });
  } finally {
    Daytona.prototype.create = originalCreate;
  }
});

test('createSandboxManager accepts a Snapshot object and extracts its name', async () => {
  const originalCreate = Daytona.prototype.create;
  const sandbox = { id: 'sandbox-snapshot-obj' };
  let createArgs;

  Daytona.prototype.create = async function (params, options) {
    createArgs = { params, options };
    return sandbox;
  };

  try {
    const snapshotObj = { name: 'my-awesome-snapshot', state: 'ready' };
    const manager = createSandboxManager({
      apiKey: 'test-key',
      snapshot: snapshotObj,
      language: 'python',
    });

    const created = await manager.getSandbox();
    assert.equal(created, sandbox);
    assert.deepEqual(createArgs, {
      params: { snapshot: 'my-awesome-snapshot', language: 'python' },
      options: undefined,
    });
  } finally {
    Daytona.prototype.create = originalCreate;
  }
});

test('createSandboxManager passes image config and snapshot log handler when configured', async () => {
  const originalCreate = Daytona.prototype.create;
  const sandbox = { id: 'sandbox-image' };
  const onSnapshotCreateLogs = () => {};
  let createArgs;

  Daytona.prototype.create = async function (params, options) {
    createArgs = { params, options };
    return sandbox;
  };

  try {
    const manager = createSandboxManager({
      apiKey: 'test-key',
      image: 'python:3.11-slim',
      language: 'python',
      onSnapshotCreateLogs,
    });

    const created = await manager.getSandbox();
    assert.equal(created, sandbox);
    assert.deepEqual(createArgs, {
      params: { image: 'python:3.11-slim', language: 'python' },
      options: { onSnapshotCreateLogs },
    });
  } finally {
    Daytona.prototype.create = originalCreate;
  }
});
