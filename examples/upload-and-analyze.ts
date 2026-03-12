/**
 * Upload an existing .xlsx file, analyze it, and download the modified version.
 *
 * Demonstrates the full upload → process → download workflow.
 */
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import * as fs from 'node:fs';
import { createAgent } from '../src/index.js';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const agent = createAgent({
  model: openrouter('minimax/minimax-m2.5:exacto'),
  instructions: 'You are a data analyst. Work in /home/daytona.',
  tools: ['bash', 'read', 'write', 'edit'],
  skills: { builtins: ['xlsx'] },
  sandbox: {
    apiKey: process.env.DAYTONA_API_KEY,
  },
});

// Upload a local spreadsheet
const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: npx tsx examples/upload-and-analyze.ts <path-to-xlsx>');
  process.exit(1);
}

await agent.uploadFiles([
  {
    path: '/home/daytona/input.xlsx',
    content: fs.readFileSync(inputFile),
  },
]);

const result = await agent.generate({
  prompt: `Analyze input.xlsx:
1. Summarize the data — sheets, row counts, column names, data types
2. Add a new "Analysis" sheet with summary statistics for every numeric column
3. Save the updated file as output.xlsx`,
});

console.log(result.text);

// Download the result
const output = await agent.downloadFile('/home/daytona/output.xlsx');
fs.writeFileSync('output.xlsx', output);
console.log('Saved output.xlsx');

await agent.destroy();
