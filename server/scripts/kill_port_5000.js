const { execSync } = require('child_process');
try {
  const out = execSync('netstat -ano').toString();
  const lines = out.split(/\r?\n/).filter(Boolean);
  const matches = lines.filter(l => l.includes(':5000'));
  const pids = matches.map(l => l.trim().split(/\s+/).pop()).filter(Boolean);
  if (!pids.length) {
    console.log('No processes found listening on :5000');
    process.exit(0);
  }
  const unique = [...new Set(pids)];
  unique.forEach(pid => {
    try {
      console.log('Killing', pid);
      execSync('taskkill /PID ' + pid + ' /F');
      console.log('Killed', pid);
    } catch (e) {
      console.error('Failed to kill', pid, e.message);
    }
  });
} catch (e) {
  console.error('Failed to run netstat:', e.message);
  process.exit(1);
}
