const { spawn } = require('child_process');

const child = spawn('npx', ['drizzle-kit', 'generate:sqlite'], {
  cwd: '/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/packages/database',
  stdio: ['pipe', 'pipe', 'inherit']
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  if (output.includes('Is ') || output.includes('?') || output.includes('rename') || output.includes('create')) {
    setTimeout(() => {
      console.log('\n[Auto-Responder] Sending Enter (after 500ms delay)...');
      child.stdin.write('\n');
    }, 500);
  }
});

child.on('close', (code) => {
  console.log(`\n[Auto-Responder] Process exited with code ${code}`);
  process.exit(code);
});
