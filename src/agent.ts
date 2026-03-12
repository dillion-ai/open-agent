import { ToolLoopAgent, stepCountIs, type ToolSet } from 'ai';
import { createSandboxManager } from './sandbox/manager.js';
import { resolveTools } from './tools/index.js';
import { loadSkills } from './skills/loader.js';
import { createSkillTool, buildSkillSystemPrompt } from './skills/skill-tool.js';
import type { OpenAgentConfig, RunOptions, SkillsConfig } from './types.js';

export function createAgent(config: OpenAgentConfig) {
  const { model, instructions = '', tools: toolNames = [], sandbox: sandboxConfig, skills: skillsOption, maxSteps = 30, cwd = '/home/daytona' } = config;

  const { getSandbox, cleanup } = createSandboxManager(sandboxConfig);

  // Normalize skills config: string[] is legacy shorthand for { custom: [...] }
  const skillsConfig: SkillsConfig = Array.isArray(skillsOption)
    ? { custom: skillsOption }
    : skillsOption ?? {};

  // Load skills synchronously (small local files)
  const skills = loadSkills(skillsConfig.builtins, skillsConfig.custom);

  // Build tools
  const builtInTools = resolveTools(toolNames, getSandbox, cwd);
  const skillTools = createSkillTool(skills);
  const allTools: ToolSet = { ...builtInTools, ...skillTools };

  // Build system prompt
  const skillPrompt = buildSkillSystemPrompt(skills);
  const systemPrompt = [instructions, skillPrompt].filter(Boolean).join('\n');

  // Create the ToolLoopAgent
  const agent = new ToolLoopAgent({
    model,
    tools: allTools,
    instructions: systemPrompt,
    stopWhen: stepCountIs(maxSteps),
  });

  const generate = async (options: RunOptions) => {
    const params: Record<string, unknown> = {};
    if (options.prompt) params.prompt = options.prompt;
    if (options.messages) {
      params.messages = options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }
    if (options.abortSignal) params.abortSignal = options.abortSignal;

    return agent.generate(params as any);
  };

  const stream = async (options: RunOptions) => {
    const params: Record<string, unknown> = {};
    if (options.prompt) params.prompt = options.prompt;
    if (options.messages) {
      params.messages = options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }
    if (options.abortSignal) params.abortSignal = options.abortSignal;

    return agent.stream(params as any);
  };

  const uploadFiles = async (files: Array<{ path: string; content: string | Buffer }>) => {
    const sandbox = await getSandbox();
    await sandbox.fs.uploadFiles(
      files.map((f) => ({
        source: Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content, 'utf-8'),
        destination: f.path,
      })),
    );
  };

  const downloadFile = async (remotePath: string): Promise<Buffer> => {
    const sandbox = await getSandbox();
    return sandbox.fs.downloadFile(remotePath);
  };

  const downloadFiles = async (remotePaths: string[]): Promise<Array<{ path: string; content: Buffer }>> => {
    return Promise.all(
      remotePaths.map(async (p) => ({
        path: p,
        content: await downloadFile(p),
      })),
    );
  };

  const destroy = async () => {
    await cleanup();
  };

  return { generate, stream, uploadFiles, downloadFile, downloadFiles, destroy };
}
