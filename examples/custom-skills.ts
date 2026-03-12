/**
 * Using custom skills alongside built-in ones.
 *
 * Shows how to point the agent at a directory of your own .md skill files
 * while also keeping the built-in xlsx skill enabled.
 */
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createAgent } from '../src/index.js';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const agent = createAgent({
  model: openrouter('minimax/minimax-m2.5:exacto'),
  instructions: 'You are a helpful assistant.',
  tools: ['bash', 'read', 'write', 'edit', 'glob', 'grep'],
  skills: {
    builtins: ['xlsx'],             // pick specific built-ins
    custom: ['./my-skills/'],       // directory of .md skill files
  },
  maxSteps: 50,
  sandbox: {
    apiKey: process.env.DAYTONA_API_KEY,
  },
});

const result = await agent.generate({
  prompt: 'List the skills you have available and what each one does.',
});

console.log(result.text);
await agent.destroy();
