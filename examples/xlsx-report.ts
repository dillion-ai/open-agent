/**
 * Generate an Excel financial report from raw CSV data.
 *
 * Uploads a CSV, asks the agent to build a formatted .xlsx with formulas,
 * then downloads the result locally.
 */
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createAgent } from '../src/index.js';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const agent = createAgent({
  model: openrouter('minimax/minimax-m2.5:exacto'),
  instructions: 'You are a financial analyst. Work in /home/daytona.',
  tools: ['bash', 'read', 'write', 'edit'],
  skills: { builtins: ['xlsx'] },
  sandbox: {
    apiKey: process.env.DAYTONA_API_KEY,
  },
});

// Upload sample revenue data
await agent.uploadFiles([
  {
    path: '/home/daytona/revenue.csv',
    content: [
      'Month,Revenue,Expenses',
      'Jan,120000,85000',
      'Feb,135000,88000',
      'Mar,128000,82000',
      'Apr,142000,90000',
      'May,155000,95000',
      'Jun,168000,98000',
    ].join('\n'),
  },
]);

const stream = await agent.stream({
  prompt: `Read revenue.csv and create a professional financial report as report.xlsx:
- Summary sheet with totals, averages, and profit margins using Excel formulas
- Monthly breakdown sheet with the raw data plus calculated Profit and Margin% columns
- Use proper number formatting and color coding per financial model standards`,
});

for await (const part of stream.fullStream) {
  if (part.type === 'text-delta') {
    process.stdout.write(part.text);
  }
  if (part.type === 'tool-call') {
    console.error(`\n[Tool: ${part.toolName}]`);
  }
  if (part.type === 'tool-result') {
    const out = typeof part.output === 'string' ? part.output : JSON.stringify(part.output ?? '');
    console.error(`  → ${out.slice(0, 80)}${out.length > 80 ? '...' : ''}`);
  }
  if (part.type === 'file') {
    console.error(`\n[File: ${part.file.mediaType}]`);
  }

}
console.log('\n\nDone.');
await agent.destroy();
