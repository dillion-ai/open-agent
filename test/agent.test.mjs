import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { ToolLoopAgent } from 'ai';
import { createAgent, loadSkills } from '../dist/index.js';

const require = createRequire(import.meta.url);

async function withPatchedGenerate(fn) {
  const originalGenerate = ToolLoopAgent.prototype.generate;
  try {
    return await fn();
  } finally {
    ToolLoopAgent.prototype.generate = originalGenerate;
  }
}

test('loadSkills is opt-in by default and still loads built-ins explicitly', () => {
  assert.deepEqual(loadSkills(), []);

  const skills = loadSkills(true);
  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, 'xlsx');
});

test('CJS consumers can still load built-in skills', () => {
  const { loadSkills: loadSkillsCjs } = require('../dist/index.cjs');
  const skills = loadSkillsCjs(true);

  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, 'xlsx');
});

test('createAgent does not inject skills unless requested', async () => {
  await withPatchedGenerate(async () => {
    let capturedSettings;

    ToolLoopAgent.prototype.generate = async function (params) {
      capturedSettings = this.settings;
      return params;
    };

    const agent = createAgent({
      model: {},
      sandbox: { instance: {} },
      tools: [],
    });

    const result = await agent.generate({ prompt: 'ping' });
    assert.deepEqual(result, { prompt: 'ping' });
    assert.equal(capturedSettings.instructions, '');
    assert.deepEqual(capturedSettings.tools, {});
  });
});

test('createAgent injects the skill tool only when built-ins are enabled', async () => {
  await withPatchedGenerate(async () => {
    let capturedSettings;

    ToolLoopAgent.prototype.generate = async function (params) {
      capturedSettings = this.settings;
      return params;
    };

    const agent = createAgent({
      model: {},
      sandbox: { instance: {} },
      tools: [],
      skills: { builtins: true },
    });

    await agent.generate({ prompt: 'ping' });
    assert.ok(capturedSettings.instructions.includes('## Available Skills'));
    assert.ok(Object.hasOwn(capturedSettings.tools, 'use_skill'));
  });
});

test('createAgent validates prompt/messages inputs before calling the model', async () => {
  await withPatchedGenerate(async () => {
    let generateCalls = 0;

    ToolLoopAgent.prototype.generate = async function (params) {
      generateCalls += 1;
      return params;
    };

    const agent = createAgent({
      model: {},
      sandbox: { instance: {} },
      tools: [],
    });

    await assert.rejects(
      agent.generate({
        prompt: 'ping',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      /exactly one of "prompt" or "messages"/,
    );

    await assert.rejects(
      agent.generate({}),
      /exactly one of "prompt" or "messages"/,
    );

    await assert.rejects(
      agent.generate({ messages: [] }),
      /must contain at least one message/,
    );

    const result = await agent.generate({
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(generateCalls, 1);
    assert.deepEqual(result, {
      messages: [{ role: 'user', content: 'hello' }],
    });
  });
});
