import { createAgent } from './agent.js';
import { defaultToolsForProject } from './tools.js';

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENROUTER_API_KEY environment variable is required.');
    process.exit(1);
  }

  const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();
  const tools = defaultToolsForProject(projectRoot);

  const agent = createAgent({
    apiKey,
    model: process.env.MODEL ?? 'openrouter/auto',
    tools,
    projectRoot,
    maxSteps: 10,
  });

  agent.on('thinking:start', () => process.stderr.write('\nThinking...\n'));
  agent.on('tool:call', (name, args) => process.stderr.write(`  Tool: ${name} ${JSON.stringify(args)}\n`));
  agent.on('tool:result', (name, result) => process.stderr.write(`  Result: ${name}\n`));
  agent.on('stream:delta', (delta) => process.stdout.write(delta));
  agent.on('stream:end', () => process.stdout.write('\n'));
  agent.on('error', (err) => {
    process.stderr.write(`\nError: ${err.message}\n`);
    process.exit(1);
  });

  const args = process.argv.slice(2);

  if (args.length > 0) {
    const prompt = args.join(' ');
    await agent.send(prompt);
    return;
  }

  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`Documentator Agent ready (project: ${projectRoot})`);
  console.log('Type your message (Ctrl+C to exit):\n');

  const prompt = () => {
    rl.question('You: ', async (input) => {
      if (!input.trim()) {
        prompt();
        return;
      }
      await agent.send(input.trim());
      prompt();
    });
  };

  prompt();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
