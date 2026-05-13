import { tool } from '@openrouter/sdk';
import { z } from 'zod';
import { readdir, readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { join, relative, extname, dirname } from 'node:path';

function resolvePath(projectRoot: string, relativePath: string): string {
  const resolved = join(projectRoot, relativePath);
  if (!resolved.startsWith(projectRoot)) {
    throw new Error('Path traversal not allowed');
  }
  return resolved;
}

async function findMarkdownFiles(dir: string, baseDir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      files.push(...await findMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && (extname(entry.name) === '.md' || extname(entry.name) === '.mdx')) {
      files.push(relative(baseDir, fullPath));
    }
  }
  return files.sort();
}

export function createTools(projectRoot: string) {
  const listDocs = tool({
    name: 'list_docs',
    description: 'List all markdown/mdx files in the docs/ directory of the project. Returns relative paths.',
    inputSchema: z.object({
      directory: z.string().optional().describe('Subdirectory to search within docs/ (default: entire docs/)'),
    }),
    execute: async ({ directory }) => {
      const docsDir = resolvePath(projectRoot, directory ? `docs/${directory}` : 'docs');
      try {
        const stats = await stat(docsDir);
        if (!stats.isDirectory()) {
          return { error: 'docs/ is not a directory', files: [] };
        }
        const files = await findMarkdownFiles(docsDir, projectRoot);
        return { files, count: files.length };
      } catch {
        return { error: 'docs/ directory not found', files: [] };
      }
    },
  });

  const readDoc = tool({
    name: 'read_doc',
    description: 'Read the content of a documentation file. Provide the relative path from project root (e.g., "docs/PRD.md").',
    inputSchema: z.object({
      path: z.string().describe('Relative path to the doc file (e.g., "docs/PRD.md")'),
    }),
    execute: async ({ path: relativePath }) => {
      const fullPath = resolvePath(projectRoot, relativePath);
      try {
        const content = await readFile(fullPath, 'utf-8');
        const stats = await stat(fullPath);
        return {
          path: relativePath,
          content,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      } catch {
        return { error: `File not found: ${relativePath}` };
      }
    },
  });

  const writeDoc = tool({
    name: 'write_doc',
    description: 'Write or update a documentation file. Creates parent directories if needed.',
    inputSchema: z.object({
      path: z.string().describe('Relative path to the doc file (e.g., "docs/API.md")'),
      content: z.string().describe('The markdown content to write'),
    }),
    execute: async ({ path: relativePath, content }) => {
      const fullPath = resolvePath(projectRoot, relativePath);
      try {
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content, 'utf-8');
        return { success: true, path: relativePath, size: content.length };
      } catch (err) {
        return { error: `Failed to write: ${relativePath}`, details: String(err) };
      }
    },
  });

  const readMapping = tool({
    name: 'read_mapping',
    description: 'Read the docs mapping file (docs/.mapping.json) that tracks page IDs for published documentation.',
    inputSchema: z.object({}),
    execute: async () => {
      const mapPath = resolvePath(projectRoot, 'docs/.mapping.json');
      try {
        const content = await readFile(mapPath, 'utf-8');
        return { mapping: JSON.parse(content), raw: content };
      } catch {
        return { mapping: null, raw: null, note: 'No mapping file found. This is normal for new projects.' };
      }
    },
  });

  const writeMapping = tool({
    name: 'write_mapping',
    description: 'Update the docs mapping file. Preserves existing pageId values. Use with caution.',
    inputSchema: z.object({
      mapping: z.record(z.any()).describe('The complete mapping object to write'),
    }),
    execute: async ({ mapping }) => {
      const mapPath = resolvePath(projectRoot, 'docs/.mapping.json');
      try {
        const content = JSON.stringify(mapping, null, 2) + '\n';
        await writeFile(mapPath, content, 'utf-8');
        return { success: true, path: 'docs/.mapping.json' };
      } catch (err) {
        return { error: 'Failed to write mapping file', details: String(err) };
      }
    },
  });

  const readConfig = tool({
    name: 'read_config',
    description: 'Read the documentator.config.json file from the project root.',
    inputSchema: z.object({}),
    execute: async () => {
      const configPath = resolvePath(projectRoot, 'documentator.config.json');
      try {
        const content = await readFile(configPath, 'utf-8');
        return { config: JSON.parse(content), raw: content };
      } catch {
        return { config: null, raw: null, note: 'No config file found.' };
      }
    },
  });

  const analyzeDocs = tool({
    name: 'analyze_docs',
    description: 'Analyze the documentation set for issues: missing files, duplicates, orphaned mappings, structure problems.',
    inputSchema: z.object({}),
    execute: async () => {
      const docsDir = resolvePath(projectRoot, 'docs');
      const mapPath = resolvePath(projectRoot, 'docs/.mapping.json');
      const issues: Array<{ type: string; detail: string; path?: string }> = [];

      let markdownFiles: string[] = [];
      try {
        markdownFiles = await findMarkdownFiles(docsDir, projectRoot);
      } catch {
        issues.push({ type: 'error', detail: 'docs/ directory not found' });
      }

      let mapping: Record<string, any> = {};
      try {
        const mapContent = await readFile(mapPath, 'utf-8');
        mapping = JSON.parse(mapContent);
      } catch {
        if (markdownFiles.length > 0) {
          issues.push({ type: 'warning', detail: 'No mapping file found but docs exist' });
        }
      }

      const mappedPaths = new Set(Object.keys(mapping));
      const titlesSeen = new Map<string, string[]>();

      for (const file of markdownFiles) {
        if (!mappedPaths.has(file)) {
          issues.push({ type: 'unmapped', detail: 'No mapping entry for file', path: file });
        }

        const fileName = file.split('/').pop() ?? file;
        const title = fileName.replace(/\.(md|mdx)$/, '');
        const existing = titlesSeen.get(title) ?? [];
        existing.push(file);
        titlesSeen.set(title, existing);
      }

      for (const [title, paths] of titlesSeen) {
        if (paths.length > 1) {
          issues.push({ type: 'duplicate_title', detail: `Duplicate title "${title}"`, paths: paths as any });
        }
      }

      for (const mappedPath of mappedPaths) {
        if (!markdownFiles.includes(mappedPath)) {
          issues.push({ type: 'orphaned_mapping', detail: 'Mapped file does not exist locally', path: mappedPath });
        }
      }

      return {
        totalDocs: markdownFiles.length,
        totalMapped: mappedPaths.size,
        issues,
        issueCount: issues.length,
        files: markdownFiles,
      };
    },
  });

  return [listDocs, readDoc, writeDoc, readMapping, writeMapping, readConfig, analyzeDocs];
}

export const defaultToolsForProject = createTools;
