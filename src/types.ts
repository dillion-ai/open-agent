import type { LanguageModel, ToolSet } from 'ai';
import type { Sandbox } from '@daytonaio/sdk';
import type { BuiltInSkillName } from './skills/loader.js';

export type BuiltInToolName = 'bash' | 'read' | 'write' | 'edit' | 'glob' | 'grep' | 'python';

export interface SandboxConfig {
  apiKey?: string;
  apiUrl?: string;
  target?: string;
  /** Sandbox language/runtime. Default: 'typescript' */
  language?: string;
  /** Pass an existing Sandbox instance to reuse it instead of creating a new one */
  instance?: Sandbox;
}

export interface Skill {
  name: string;
  description: string;
  instructions: string;
}

export interface SkillsConfig {
  /** Which built-in skills to enable. `true` = all, `false` = none, or an array of names. Default: false */
  builtins?: BuiltInSkillName[] | boolean;
  /** Paths to custom .md skill files or directories containing them */
  custom?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptRunOptions {
  prompt: string;
  messages?: never;
  abortSignal?: AbortSignal;
  onStepFinish?: (event: any) => void | Promise<void>;
}

export interface MessageRunOptions {
  prompt?: never;
  messages: ChatMessage[];
  abortSignal?: AbortSignal;
  onStepFinish?: (event: any) => void | Promise<void>;
}

export type RunOptions = PromptRunOptions | MessageRunOptions;

export interface OpenAgentConfig {
  model: LanguageModel;
  instructions?: string;
  tools?: BuiltInToolName[];
  sandbox: SandboxConfig;
  /** Skill configuration. Skills are opt-in; pass paths array for custom-only (backwards compat), or a SkillsConfig object. */
  skills?: string[] | SkillsConfig;
  maxSteps?: number;
  cwd?: string;
}

export type GetSandbox = () => Promise<Sandbox>;

export type ToolFactory = (getSandbox: GetSandbox, cwd: string) => ToolSet;
