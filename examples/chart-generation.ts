/**
 * Generate a matplotlib chart from data and download the PNG.
 *
 * Demonstrates uploading data, running Python in the sandbox to
 * produce a chart, and pulling the image back locally.
 */
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import * as fs from 'node:fs';
import { createAgent } from '../src/index.js';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const agent = createAgent({
  model: openrouter('minimax/minimax-m2.5:exacto'),
  instructions: 'You are a data visualization expert. Work in /home/daytona.',
  tools: ['bash', 'read', 'write', 'edit', 'glob', 'grep'],
  skills: { builtins: ['xlsx'] },
  sandbox: {
    apiKey: process.env.DAYTONA_API_KEY,
  },
  maxSteps: 20,
});

// Upload MRR/ARR data
await agent.uploadFiles([
  {
    path: '/home/daytona/metrics.csv',
    content: [
      'Month,MRR,ARR,Customers',
      '2024-01,50000,600000,120',
      '2024-02,53000,636000,128',
      '2024-03,57000,684000,135',
      '2024-04,61000,732000,142',
      '2024-05,66000,792000,155',
      '2024-06,72000,864000,168',
      '2024-07,78000,936000,180',
      '2024-08,85000,1020000,195',
      '2024-09,92000,1104000,210',
      '2024-10,100000,1200000,228',
      '2024-11,108000,1296000,245',
      '2024-12,118000,1416000,265',
    ].join('\n'),
  },
]);

const result = await agent.generate({
  prompt: `Read metrics.csv and create two publication-quality charts:

1. mrr_arr_chart.png — Dual-axis line chart showing MRR (left axis) and ARR (right axis) over time.
   Use a dark theme, label axes with dollar formatting, add a title "MRR & ARR Growth".

2. customers_chart.png — Bar chart of customer count by month with a trend line overlay.
   Use a matching dark theme, title "Customer Growth".

Use matplotlib with tight_layout. Save at 300 DPI.`,
});

console.log(result.text);

// Download both charts
const files = await agent.downloadFiles([
  '/home/daytona/mrr_arr_chart.png',
  '/home/daytona/customers_chart.png',
]);

for (const file of files) {
  const name = file.path.split('/').pop()!;
  fs.writeFileSync(name, file.content);
  console.log(`Saved ${name} (${file.content.length} bytes)`);
}

await agent.destroy();
