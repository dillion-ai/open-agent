import { tool } from 'ai';
import { z } from 'zod';
import { resolvePath } from './utils.js';
import type { GetSandbox, ToolFactory } from '../types.js';

/** If the model omits offset/limit, only this many lines are returned for large files (avoids huge tool payloads). */
const DEFAULT_READ_LINE_WINDOW = 800;

/** When a full read would exceed this line count, auto-truncate unless offset/limit are set. */
const MAX_LINES_FULL_READ = 1_500;

/**
 * When a full read would exceed this character count, auto-truncate (handles few very long lines).
 * Keeps each tool result small enough for typical LLM context + JSON encoding.
 */
const MAX_CHARS_FULL_READ = 50_000;

export const createReadTool: ToolFactory = (getSandbox: GetSandbox, cwd: string) => ({
  read: tool({
    description:
      'Read file contents from the sandbox as text. For large files, always pass offset and limit (1-based line numbers) or use grep — if you omit them on a huge file, only an initial window is returned with a hint to continue.',
    inputSchema: z.object({
      path: z.string().describe('Path to the file to read'),
      offset: z
        .number()
        .optional()
        .describe('Line number to start reading from (1-based)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of lines to read'),
    }),
    execute: async ({ path, offset, limit }) => {
      const sandbox = await getSandbox();
      const resolved = resolvePath(path, cwd);
      const buffer = await sandbox.fs.downloadFile(resolved);
      let content = buffer.toString('utf-8');

      if (offset !== undefined || limit !== undefined) {
        const lines = content.split('\n');
        const start = (offset ?? 1) - 1;
        const end = limit !== undefined ? start + limit : lines.length;
        content = lines.slice(start, end).join('\n');
        return { content };
      }

      const lines = content.split('\n');
      const tooManyLines = lines.length > MAX_LINES_FULL_READ;
      const tooManyChars = content.length > MAX_CHARS_FULL_READ;

      if (!tooManyLines && !tooManyChars) {
        return { content };
      }

      // Few lines but enormous single-line / multi-line payloads (e.g. minified JSON)
      if (tooManyChars && !tooManyLines) {
        let cut = content.slice(0, MAX_CHARS_FULL_READ);
        const lastNl = cut.lastIndexOf('\n');
        if (lastNl > Math.floor(MAX_CHARS_FULL_READ * 0.5)) {
          cut = cut.slice(0, lastNl);
        }
        return {
          content: cut,
          truncated: true,
          totalChars: content.length,
          lineCount: lines.length,
          hint:
            `Truncated to ~${MAX_CHARS_FULL_READ} characters at a newline boundary. Use read with offset/limit (line-based), or grep, to continue.`,
        };
      }

      const windowLines = Math.min(DEFAULT_READ_LINE_WINDOW, lines.length);
      let sliced = lines.slice(0, windowLines).join('\n');
      if (sliced.length > MAX_CHARS_FULL_READ) {
        let cut = sliced.slice(0, MAX_CHARS_FULL_READ);
        const lastNl = cut.lastIndexOf('\n');
        if (lastNl > Math.floor(MAX_CHARS_FULL_READ * 0.5)) {
          cut = cut.slice(0, lastNl);
        }
        return {
          content: cut,
          truncated: true,
          totalLines: lines.length,
          totalChars: content.length,
          linesReturned: windowLines,
          hint:
            `Large file: first ~${windowLines} lines still exceed the size cap; truncated further at a newline. Use read with a smaller limit, or grep. Full file has ${lines.length} lines (~${content.length} chars).`,
        };
      }
      return {
        content: sliced,
        truncated: true,
        totalLines: lines.length,
        totalChars: content.length,
        linesReturned: windowLines,
        hint:
          `Large file: showing lines 1–${windowLines} of ${lines.length} (~${content.length} chars). Use read with offset and limit (line-based, 1-based), or grep, to continue (e.g. offset=${windowLines + 1}, limit=${DEFAULT_READ_LINE_WINDOW}).`,
      };
    },
  }),
});
