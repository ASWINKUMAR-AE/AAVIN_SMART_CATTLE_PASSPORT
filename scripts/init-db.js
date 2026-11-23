// Apply Django migrations to the configured PostgreSQL database; never drop it.
const { spawn } = require('child_process');
const path = require('path');
if (process.argv.includes('--reset')) {
  console.error('Database reset is disabled for the cloud database. Use reviewed Django migrations.');
  process.exit(1);
}
const child = spawn(process.execPath, [path.resolve(__dirname, '../backend/run.js'), 'migrate'], { stdio: 'inherit' });
child.on('exit', code => process.exit(code === null ? 1 : code));
child.on('error', err => { console.error(err.message); process.exit(1); });
