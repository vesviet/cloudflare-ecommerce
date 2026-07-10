const { execSync } = require('child_process');

console.log("🧹 Starting programmatic process cleanup...");

// 1. Kill by process name keywords
const keywords = ['wrangler', 'miniflare', 'workerd'];
try {
  const psOutput = execSync('ps aux').toString();
  const lines = psOutput.split('\n');
  const myPid = process.pid;

  for (const line of lines) {
    if (keywords.some(k => line.includes(k)) && !line.includes('clean_processes.js')) {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[1], 10);
      if (pid && pid !== myPid) {
        console.log(`Killing process ${pid}: ${parts.slice(10).join(' ')}`);
        try {
          process.kill(pid, 'SIGKILL');
        } catch (e) {
          console.error(`Failed to kill ${pid}:`, e.message);
        }
      }
    }
  }
} catch (err) {
  console.error("Error listing processes:", err.message);
}

// 2. Kill by ports
const ports = [8787, 8788, 9229, 9230];
for (const port of ports) {
  try {
    const output = execSync(`lsof -t -i:${port}`).toString().trim();
    if (output) {
      const pids = output.split('\n').map(p => parseInt(p.trim(), 10)).filter(Boolean);
      for (const pid of pids) {
        if (pid !== process.pid) {
          console.log(`Killing process on port ${port} (PID ${pid})`);
          try {
            process.kill(pid, 'SIGKILL');
          } catch (e) {
            // Process might already be dead
          }
        }
      }
    }
  } catch (e) {
    // lsof exits with code 1 if no process found, which is fine
  }
}

console.log("✅ Programmatic process cleanup complete!");
