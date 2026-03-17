# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@dillion-ai/open-agent` — a thin, provider-agnostic wrapper around the Vercel AI SDK that gives any LLM sandboxed coding agent capabilities (bash, read, write, edit, glob, grep) via Daytona sandboxes.

## Commands

- **Build:** `npm run build` (uses tsup, outputs ESM + CJS to `dist/`)
- **Typecheck:** `npm run typecheck`
- **Test:** `npm run test` (builds first, then runs `node --test test/*.test.mjs`)
- **Dev:** `npm run dev` (tsup in watch mode)
- **Run an example:** `npm run build && node examples/basic.ts`
- **Run benchmarks:** `npm run build && BENCHMARK_MODELS="provider/model" OPENROUTER_API_KEY=... DAYTONA_API_KEY=... node benchmarks/financial-benchmark.ts`

## Architecture

The SDK is structured around a single entry point `createAgent()` that wires together three subsystems:

1. **Agent (`src/agent.ts`)** — `createAgent()` builds a Vercel AI SDK `ToolLoopAgent` with resolved tools, skills, and a sandbox. Returns `{ generate, stream, uploadFiles, downloadFile, downloadFiles, destroy }`. Accepts either `prompt` (string) or `messages` (chat history) via `RunOptions`.

2. **Sandbox Manager (`src/sandbox/manager.ts`)** — Lazy singleton that creates a Daytona sandbox on first use. Accepts either an `apiKey` (creates new sandbox) or an existing `instance` (reuses it). The `getSandbox` thunk is passed to every tool factory. `cleanup()` deletes the sandbox unless it was externally provided.

3. **Tools (`src/tools/`)** — Each tool (bash, read, write, edit, glob, grep, python) is a factory function `(getSandbox, cwd) => ToolSet`. They're registered in `toolRegistry` in `src/tools/index.ts` and resolved by name via `resolveTools()`.

4. **Skills (`src/skills/`)** — Optional markdown instruction files injected into the system prompt. Built-in skills (currently just `xlsx`) are inlined in `loader.ts`. Custom skills are loaded from `.md` files on disk. When skills are present, a `use_skill` tool is added (`skill-tool.ts`) that lets the model activate a skill's instructions mid-conversation.

### Key types (`src/types.ts`)

- `OpenAgentConfig` — main config passed to `createAgent()`
- `BuiltInToolName` — union of available tool names
- `GetSandbox` — `() => Promise<Sandbox>` thunk threaded through tool factories
- `ToolFactory` — `(getSandbox, cwd) => ToolSet`
- `RunOptions` — discriminated union: `PromptRunOptions | MessageRunOptions`

### Build

tsup builds from `src/index.ts` to both ESM and CJS. The `onSuccess` hook copies `src/skills/builtins/` into `dist/` so built-in skill `.md` files are available at runtime. The package is an ES module (`"type": "module"`).

### Peer dependency

`ai` (Vercel AI SDK >= 6.0.0) is a peer dependency — consumers must install it alongside this package.
