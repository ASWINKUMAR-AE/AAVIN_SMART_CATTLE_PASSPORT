// Test cattle ear-tag scanning and database records retrieval
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

console.log('Testing cattle scan and database retrieval via Django backend...');

// Run Django test suite for farmers & cattle scan
const child = spawn(
  process.execPath,
  [path.resolve(__dirname, '../backend/run.js'), 'test', 'farmers', '--settings=config.test_settings'],
  { stdio: 'inherit' }
);

child.on('exit', code => {
  if (code !== 0) {
    console.error(`Backend tests failed with exit code ${code}`);
    process.exit(code || 1);
  }
  console.log('Backend cattle scan & database tests passed successfully!');
});
