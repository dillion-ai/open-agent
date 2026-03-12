/**
 * Streaming example — watch the agent's response in real time.
 */
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createAgent } from '../src/index.js';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const agent = createAgent({
  model: openrouter('minimax/minimax-m2.5:exacto'),
  instructions: 'You are a coding assistant. Work in /home/daytona.',
  tools: ['bash', 'read', 'write', 'edit'],
  sandbox: {
    apiKey: process.env.DAYTONA_API_KEY,
  },
});

const stream = await agent.stream({
  prompt: 'Write a Python fibonacci generator using itertools and test it with the first 20 values.',
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

console.log('\n\nDone.');
await agent.destroy();
