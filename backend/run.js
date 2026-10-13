// Allows existing npm backend commands to launch Django without changing the frontend.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const localPython = path.join(__dirname, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const python = process.env.AAVIN_PYTHON || (fs.existsSync(localPython) ? localPython : (process.platform === 'win32' ? 'python' : 'python3'));
const args = process.argv.slice(2);
const child = spawn(python, [path.join(__dirname, 'manage.py'), ...args], { cwd: __dirname, stdio: 'inherit', env: process.env });
child.on('error', err => { console.error(err.message); process.exit(1); });
child.on('exit', code => process.exit(code === null ? 1 : code));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
