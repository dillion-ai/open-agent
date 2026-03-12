import type { ToolSet } from 'ai';
import type { BuiltInToolName, GetSandbox, ToolFactory } from '../types.js';
import { createBashTool } from './bash.js';
import { createReadTool } from './read.js';
import { createWriteTool } from './write.js';
import { createEditTool } from './edit.js';
import { createGlobTool } from './glob.js';
import { createGrepTool } from './grep.js';

const toolRegistry: Record<BuiltInToolName, ToolFactory> = {
  bash: createBashTool,
  read: createReadTool,
  write: createWriteTool,
  edit: createEditTool,
  glob: createGlobTool,
  grep: createGrepTool,
};

export function resolveTools(
  names: BuiltInToolName[],
  getSandbox: GetSandbox,
  cwd: string,
): ToolSet {
  const tools: ToolSet = {};
  for (const name of names) {
    const factory = toolRegistry[name];
    if (!factory) {
      throw new Error(`Unknown tool: ${name}`);
    }
    Object.assign(tools, factory(getSandbox, cwd));
  }
  return tools;
}

export {
  createBashTool,
  createReadTool,
  createWriteTool,
  createEditTool,
  createGlobTool,
  createGrepTool,
};
