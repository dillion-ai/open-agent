import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import type { Skill } from '../types.js';

function getBuiltinsDir(): string {
  const dir =
    typeof __dirname !== 'undefined'
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));

  const candidates = [
    path.resolve(dir, 'builtins'),
    path.resolve(dir, 'skills/builtins'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

const BUILTINS_DIR = getBuiltinsDir();

/** Names of all built-in skills that ship with the SDK. */
export const BUILTIN_SKILL_NAMES = ['xlsx'] as const;
export type BuiltInSkillName = (typeof BUILTIN_SKILL_NAMES)[number];

/**
 * Load built-in skills by name plus any custom skill paths.
 *
 * @param builtins - which built-in skills to enable (default: none)
 * @param customPaths - paths to user-provided .md files or directories of .md files
 */
export function loadSkills(
  builtins: BuiltInSkillName[] | boolean = false,
  customPaths: string[] = [],
): Skill[] {
  const skills: Skill[] = [];

  // Load built-in skills
  const builtinNames =
    builtins === true
      ? [...BUILTIN_SKILL_NAMES]
      : builtins === false
        ? []
        : builtins;

  for (const name of builtinNames) {
    const filePath = path.join(BUILTINS_DIR, `${name}.md`);
    const skill = parseSkillFile(filePath);
    if (skill) skills.push(skill);
  }

  // Load custom user skills
  for (const p of customPaths) {
    const resolved = path.resolve(p);
    const stat = fs.statSync(resolved, { throwIfNoEntry: false });

    if (!stat) {
      console.warn(`[open-agent] Skill path not found, skipping: ${resolved}`);
      continue;
    }

    if (stat.isDirectory()) {
      const files = fs.readdirSync(resolved).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const skill = parseSkillFile(path.join(resolved, file));
        if (skill) skills.push(skill);
      }
    } else if (resolved.endsWith('.md')) {
      const skill = parseSkillFile(resolved);
      if (skill) skills.push(skill);
    }
  }

  return skills;
}

function parseSkillFile(filePath: string): Skill | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    const name = data.name || path.basename(filePath, '.md');
    const description = data.description || '';
    const instructions = content.trim();

    if (!instructions) return null;

    return { name, description, instructions };
  } catch (err) {
    console.warn(`[open-agent] Failed to parse skill file: ${filePath}`, err instanceof Error ? err.message : err);
    return null;
  }
}
