import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import type { StreamableOutputItem } from '@openrouter/sdk';
import { createAgent, type Agent, type Message } from './agent.js';
import { defaultToolsForProject } from './tools.js';

const apiKey = process.env.OPENROUTER_API_KEY ?? '';
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();
const tools = defaultToolsForProject(projectRoot);

const agent = createAgent({
  apiKey,
  model: process.env.MODEL ?? 'openrouter/auto',
  tools,
  projectRoot,
  maxSteps: 10,
});

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={isUser ? 'cyan' : 'green'}>
        {isUser ? '> You' : '< Documentator'}
      </Text>
      <Text wrap="wrap">{message.content}</Text>
    </Box>
  );
}

function ItemRenderer({ item }: { item: StreamableOutputItem }) {
  switch (item.type) {
    case 'message': {
      const textContent = item.content?.find((c: { type: string }) => c.type === 'output_text');
      const text = textContent && 'text' in textContent ? textContent.text : '';
      return (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="green">{'< Documentator'}</Text>
          <Text wrap="wrap">{text}</Text>
          {item.status !== 'completed' && <Text color="gray">|</Text>}
        </Box>
      );
    }
    case 'function_call':
      return (
        <Text color="yellow">
          {item.status === 'completed' ? '  done' : '  running'} {item.name}
          {item.status === 'in_progress' && '...'}
        </Text>
      );
    default:
      return null;
  }
}

function InputField({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  useInput((input, key) => {
    if (disabled) return;
    if (key.return) onSubmit();
    else if (key.backspace || key.delete) onChange(value.slice(0, -1));
    else if (input && !key.ctrl && !key.meta) onChange(value + input);
  });

  return (
    <Box>
      <Text color="yellow">{'> '}</Text>
      <Text>{value}</Text>
      <Text color="gray">{disabled ? ' ...' : '|'}</Text>
    </Box>
  );
}

function App() {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<Map<string, StreamableOutputItem>>(new Map());

  useInput((_, key) => {
    if (key.escape) exit();
  });

  useEffect(() => {
    const onThinkingStart = () => {
      setIsLoading(true);
      setItems(new Map());
    };

    const onItemUpdate = (item: StreamableOutputItem) => {
      setItems((prev) => new Map(prev).set(item.id, item));
    };

    const onMessageAssistant = () => {
      setMessages(agent.getMessages());
      setItems(new Map());
      setIsLoading(false);
    };

    const onError = () => {
      setIsLoading(false);
    };

    agent.on('thinking:start', onThinkingStart);
    agent.on('item:update', onItemUpdate);
    agent.on('message:assistant', onMessageAssistant);
    agent.on('error', onError);

    return () => {
      agent.off('thinking:start', onThinkingStart);
      agent.off('item:update', onItemUpdate);
      agent.off('message:assistant', onMessageAssistant);
      agent.off('error', onError);
    };
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    await agent.send(text);
  }, [input, isLoading]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">Documentator Agent</Text>
        <Text color="gray"> | project: {projectRoot} | Esc to exit</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {Array.from(items.values()).map((item) => (
          <ItemRenderer key={item.id} item={item} />
        ))}
      </Box>

      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <InputField
          value={input}
          onChange={setInput}
          onSubmit={sendMessage}
          disabled={isLoading}
        />
      </Box>
    </Box>
  );
}

if (!apiKey) {
  console.error('Error: OPENROUTER_API_KEY environment variable is required.');
  process.exit(1);
}

render(<App />);
