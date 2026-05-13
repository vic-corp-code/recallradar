import { OpenRouter, stepCountIs } from '@openrouter/sdk';
import type { Tool, StreamableOutputItem } from '@openrouter/sdk';
import { EventEmitter } from 'eventemitter3';
import { z } from 'zod';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentEvents {
  'message:user': (message: Message) => void;
  'message:assistant': (message: Message) => void;
  'item:update': (item: StreamableOutputItem) => void;
  'stream:start': () => void;
  'stream:delta': (delta: string, accumulated: string) => void;
  'stream:end': (fullText: string) => void;
  'tool:call': (name: string, args: unknown) => void;
  'tool:result': (name: string, result: unknown) => void;
  'reasoning:update': (text: string) => void;
  'error': (error: Error) => void;
  'thinking:start': () => void;
  'thinking:end': () => void;
}

const SYSTEM_INSTRUCTIONS = `You are the Documentator Agent. Your job is to keep project documentation healthy, organized, and consistent.

## Scope

Work only in documentation-related areas unless the user explicitly asks otherwise:
- docs/
- docs/.mapping.json (the mapping file that tracks published page IDs)
- documentator.config.json
- Documentation-specific scripts or config

Do not modify product behavior or app code.

## Primary Workflow

1. Inspect docs/ to understand the local documentation set.
2. Inspect docs/.mapping.json and documentator.config.json.
3. Identify markdown files that are missing, outdated, duplicated, badly titled, or unmapped.
4. Compare local documentation intent with the mapping file.
5. Build or run a preview plan before any write operation.
6. Run sync operations only when the mapping and content look safe.
7. Prefer safe updates and page adoption over automatic page creation.
8. If creating missing pages is needed, explain exactly what will be created before running create mode.
9. Report exactly what changed.

For automation, prefer machine-readable preview output first. Parse the JSON plan before deciding whether a write operation is safe.

## Safety Rules

- Preserve all existing pageId values in docs/.mapping.json.
- Never regenerate the whole map when existing page IDs are present.
- Never create duplicate pages with the same title.
- If a local file has no pageId, first try to adopt an existing page by title and parent.
- Never delete or overwrite pages blindly.
- Use archive-orphan behavior only when explicitly requested or clearly confirmed.
- If the plan suggests risky duplicates, ambiguous parentage, unexpected archives, or missing credentials, stop and report the risk instead of syncing.

## Report Format

When producing reports, use this structure:

**Local Docs**
- Summary of markdown files found

**Mapping Health**
- Missing mappings, duplicate titles, missing page IDs, questionable parents

**Proposed Actions**
- Creates, updates, adoptions, archives, skips, errors

**Commands Run**
- Exact commands and whether they were preview or write operations

**Final Result**
- What changed, what did not change, and any follow-up risks

Keep the report factual and concise. If no sync was run, say why.`;

export interface AgentConfig {
  apiKey: string;
  model?: string;
  instructions?: string;
  tools?: Tool<z.ZodTypeAny, z.ZodTypeAny>[];
  maxSteps?: number;
  projectRoot?: string;
}

export class Agent extends EventEmitter<AgentEvents> {
  private client: OpenRouter;
  private messages: Message[] = [];
  private config: Required<Omit<AgentConfig, 'projectRoot'>> & { apiKey: string; projectRoot: string };

  constructor(config: AgentConfig) {
    super();
    this.client = new OpenRouter({ apiKey: config.apiKey });
    this.config = {
      apiKey: config.apiKey,
      model: config.model ?? 'openrouter/auto',
      instructions: config.instructions ?? SYSTEM_INSTRUCTIONS,
      tools: config.tools ?? [],
      maxSteps: config.maxSteps ?? 10,
      projectRoot: config.projectRoot ?? process.cwd(),
    };
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clearHistory(): void {
    this.messages = [];
  }

  setInstructions(instructions: string): void {
    this.config.instructions = instructions;
  }

  addTool(newTool: Tool<z.ZodTypeAny, z.ZodTypeAny>): void {
    this.config.tools.push(newTool);
  }

  getProjectRoot(): string {
    return this.config.projectRoot;
  }

  async send(content: string): Promise<string> {
    const userMessage: Message = { role: 'user', content };
    this.messages.push(userMessage);
    this.emit('message:user', userMessage);
    this.emit('thinking:start');

    try {
      const result = this.client.callModel({
        model: this.config.model,
        instructions: this.config.instructions,
        input: this.messages.map((m) => ({ role: m.role, content: m.content })),
        tools: this.config.tools.length > 0 ? this.config.tools : undefined,
        stopWhen: [stepCountIs(this.config.maxSteps)],
      });

      this.emit('stream:start');
      let fullText = '';

      for await (const item of result.getItemsStream()) {
        this.emit('item:update', item);

        switch (item.type) {
          case 'message': {
            const textContent = item.content?.find((c: { type: string }) => c.type === 'output_text');
            if (textContent && 'text' in textContent) {
              const newText = textContent.text;
              if (newText !== fullText) {
                const delta = newText.slice(fullText.length);
                fullText = newText;
                this.emit('stream:delta', delta, fullText);
              }
            }
            break;
          }
          case 'function_call':
            if (item.status === 'completed') {
              this.emit('tool:call', item.name, JSON.parse(item.arguments || '{}'));
            }
            break;
          case 'function_call_output':
            this.emit('tool:result', item.callId, item.output);
            break;
          case 'reasoning': {
            const reasoningText = item.content?.find((c: { type: string }) => c.type === 'reasoning_text');
            if (reasoningText && 'text' in reasoningText) {
              this.emit('reasoning:update', reasoningText.text);
            }
            break;
          }
        }
      }

      if (!fullText) {
        fullText = await result.getText();
      }

      this.emit('stream:end', fullText);

      const assistantMessage: Message = { role: 'assistant', content: fullText };
      this.messages.push(assistantMessage);
      this.emit('message:assistant', assistantMessage);

      return fullText;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    } finally {
      this.emit('thinking:end');
    }
  }

  async sendSync(content: string): Promise<string> {
    const userMessage: Message = { role: 'user', content };
    this.messages.push(userMessage);
    this.emit('message:user', userMessage);

    try {
      const result = this.client.callModel({
        model: this.config.model,
        instructions: this.config.instructions,
        input: this.messages.map((m) => ({ role: m.role, content: m.content })),
        tools: this.config.tools.length > 0 ? this.config.tools : undefined,
        stopWhen: [stepCountIs(this.config.maxSteps)],
      });

      const fullText = await result.getText();
      const assistantMessage: Message = { role: 'assistant', content: fullText };
      this.messages.push(assistantMessage);
      this.emit('message:assistant', assistantMessage);

      return fullText;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    }
  }
}

export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
