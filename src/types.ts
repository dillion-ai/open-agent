import type { LanguageModel, ToolSet } from 'ai';
import type { Sandbox } from '@daytonaio/sdk';
import type { BuiltInSkillName } from './skills/loader.js';

export type BuiltInToolName = 'bash' | 'read' | 'write' | 'edit' | 'glob' | 'grep';

export interface SandboxConfig {
  apiKey?: string;
  apiUrl?: string;
  target?: string;
  /** Pass an existing Sandbox instance to reuse it instead of creating a new one */
  instance?: Sandbox;
}

export interface Skill {
  name: string;
  description: string;
  instructions: string;
}

export interface SkillsConfig {
  /** Which built-in skills to enable. `true` = all, `false` = none, or an array of names. Default: true */
  builtins?: BuiltInSkillName[] | boolean;
  /** Paths to custom .md skill files or directories containing them */
  custom?: string[];
}

export interface RunOptions {
  prompt?: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  abortSignal?: AbortSignal;
}

export interface OpenAgentConfig {
  model: LanguageModel;
  instructions?: string;
  tools?: BuiltInToolName[];
  sandbox: SandboxConfig;
  /** Skill configuration. Pass paths array for custom-only (backwards compat), or a SkillsConfig object. */
  skills?: string[] | SkillsConfig;
  maxSteps?: number;
  cwd?: string;
}

export type GetSandbox = () => Promise<Sandbox>;

export type ToolFactory = (getSandbox: GetSandbox, cwd: string) => ToolSet;
