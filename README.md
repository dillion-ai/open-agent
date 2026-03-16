# open-agent

A thin, vendor-agnostic wrapper around the [Vercel AI SDK](https://sdk.vercel.ai) that gives any LLM Claude-style coding agent capabilities — sandboxed `bash`, `read`, `write`, `edit`, `glob`, and `grep` — in a few lines of code.

No framework lock-in. No opinions on prompts or orchestration. Just plug in your model, point it at a [Daytona](https://daytona.io) sandbox, and let it work.

## How it relates to the Claude Agent SDK

Anthropic's [Claude Agent SDK](https://docs.anthropic.com/en/docs/agent-sdk) gives you the full Claude Code experience — built-in tools, agent loop, context management, hooks, subagents, MCP, and sessions — but it's tied to Claude models via the Anthropic API.

**open-agent** takes the same core idea (give an LLM coding tools that run in a sandbox) and makes it work with **any model** through the Vercel AI SDK. It's a much thinner layer: no hooks, no subagents, no sessions — just tools, a sandbox, and a generate/stream loop. If you want the full-featured Claude agent experience, use the Claude Agent SDK. If you want the same tool pattern with any model and minimal abstraction, use this.

## Install

```bash
npm install @dillion-ai/open-agent ai
```

`ai` is a peer dependency (>= 6.0.0).

## Quick start

```ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAgent } from "@dillion-ai/open-agent";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const agent = createAgent({
  model: openrouter("minimax/minimax-m2.5:exacto"),
  instructions: "You are a coding assistant.",
  tools: ["bash", "read", "write", "edit", "glob", "grep"],
  sandbox: { apiKey: process.env.DAYTONA_API_KEY },
});

const result = await agent.generate({
  prompt: "Create a hello world TypeScript file and run it",
});

console.log(result.text);

await agent.destroy();
```

Swap the model string for any provider — OpenAI, Google, Mistral, open-source via OpenRouter — everything else stays the same.

## What this gives you

This SDK is intentionally small. It provides the wiring between the AI SDK's `ToolLoopAgent` and a cloud sandbox, and nothing more:

- **Any model** — anything the Vercel AI SDK supports works out of the box
- **Claude-style tools** — the same `bash`, `read`, `write`, `edit`, `glob`, `grep` pattern, running inside a Daytona sandbox
- **Sandboxed execution** — code runs in an isolated cloud environment, not on your machine
- **File I/O** — upload files in, download results out
- **Streaming** — first-class streaming support via the AI SDK
- **Skills** — optional markdown instruction files for domain-specific workflows (e.g. Excel generation)

The SDK doesn't impose prompt templates, memory systems, RAG pipelines, or agent architectures. You bring those.

## Tools

| Tool   | Description                        |
| ------ | ---------------------------------- |
| `bash` | Execute shell commands             |
| `read` | Read file contents                 |
| `write`| Write/create files                 |
| `edit` | Make targeted edits to files       |
| `glob` | Find files by pattern              |
| `grep` | Search file contents with regex    |

## Skills

Skills are markdown files that get injected into the system prompt. They teach the agent domain-specific workflows without requiring code changes. Skills are opt-in: unless you pass `skills`, no skill prompt or `use_skill` tool is added. The SDK ships a built-in `xlsx` skill; you can add your own.

```ts
const agent = createAgent({
  model,
  tools: ["bash", "read", "write", "edit"],
  skills: {
    builtins: ["xlsx"],
    custom: ["./my-skills/"],
  },
  sandbox: { apiKey: process.env.DAYTONA_API_KEY },
});
```

## File upload & download

```ts
await agent.uploadFiles([
  { path: "/home/daytona/data.csv", content: csvString },
]);

await agent.generate({ prompt: "Analyze data.csv and save results to output.xlsx" });

const file = await agent.downloadFile("/home/daytona/output.xlsx");
fs.writeFileSync("output.xlsx", file);
```

## Streaming

```ts
const stream = await agent.stream({
  prompt: "Write a Python fibonacci generator and test it",
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## Configuration

```ts
createAgent({
  model,                    // Any Vercel AI SDK LanguageModel
  instructions: "",         // System prompt — yours to define
  tools: [],                // Which built-in tools to enable
  sandbox: {                // Daytona sandbox config
    apiKey: "",
    apiUrl: "",             //   Custom API URL (optional)
    target: "",             //   Target region (optional)
    language: "typescript", //   Sandbox language/runtime (optional)
    instance: sandbox,      //   Reuse an existing Sandbox (optional)
  },
  skills: {                 // Optional
    builtins: false,        //   true | false | string[]
    custom: [],             //   Paths to .md files or directories
  },
  maxSteps: 30,             // Max tool-use loop iterations
  cwd: "/home/daytona",    // Working directory in the sandbox
});
```

## Examples

See [`examples/`](./examples):

- **[basic.ts](./examples/basic.ts)** — minimal usage
- **[streaming.ts](./examples/streaming.ts)** — real-time streaming
- **[xlsx-report.ts](./examples/xlsx-report.ts)** — Excel financial report from CSV
- **[chart-generation.ts](./examples/chart-generation.ts)** — matplotlib charts to PNG
- **[upload-and-analyze.ts](./examples/upload-and-analyze.ts)** — upload, analyze, download spreadsheets
- **[custom-skills.ts](./examples/custom-skills.ts)** — custom skill files

## License

MIT
