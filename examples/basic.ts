import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createAgent } from '../src/index.js';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const agent = createAgent({
  model: openrouter('minimax/minimax-m2.5:exacto'),
  instructions: 'You are a coding assistant. Work in the /home/daytona directory.',
  tools: ['bash', 'read', 'write', 'edit', 'glob', 'grep', 'python'],
  sandbox: {
    apiKey: process.env.DAYTONA_API_KEY,
  },
});

const result = await agent.generate({
  prompt: 'Create a hello world TypeScript file and run it',
});
console.log(result);

console.log(result.text);
await agent.destroy();
