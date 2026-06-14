const { spawn } = require('child_process');

const proc = spawn('npx.cmd', ['drizzle-kit', 'generate:sqlite'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

const interval = setInterval(() => {
  proc.stdin.write('\n');
}, 500);

proc.on('close', (code) => {
  clearInterval(interval);
  process.exit(code);
});
