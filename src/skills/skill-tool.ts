import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import type { Skill } from '../types.js';

export function createSkillTool(skills: Skill[]): ToolSet {
  if (skills.length === 0) return {};

  const skillMap = new Map(skills.map((s) => [s.name, s]));
  const skillNames = skills.map((s) => s.name);

  return {
    use_skill: tool({
      description: `Invoke a skill to get specialized instructions. Available skills: ${skillNames.join(', ')}`,
      inputSchema: z.object({
        name: z.string().describe(`Name of the skill to invoke (one of: ${skillNames.join(', ')})`),
      }),
      execute: async ({ name }) => {
        const skill = skillMap.get(name);
        if (!skill) {
          return { error: `Unknown skill: ${name}. Available: ${skillNames.join(', ')}` };
        }
        return { instructions: skill.instructions };
      },
    }),
  };
}

export function buildSkillSystemPrompt(skills: Skill[]): string {
  if (skills.length === 0) return '';

  const lines = skills.map(
    (s) => `- **${s.name}**: ${s.description || 'No description'}`,
  );

  return [
    '',
    '## Available Skills',
    'You can invoke these skills using the `use_skill` tool to get specialized instructions:',
    ...lines,
  ].join('\n');
}
