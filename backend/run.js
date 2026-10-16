// Allows existing npm backend commands to launch Django without changing the frontend.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const localPython = path.join(__dirname, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const defaultWinPython = 'C:\\Users\\Aswin\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';
const systemPython = process.platform === 'win32' ? (fs.existsSync(defaultWinPython) ? defaultWinPython : 'python') : 'python3';
const python = process.env.AAVIN_PYTHON || (fs.existsSync(localPython) ? localPython : systemPython);
const args = process.argv.slice(2);
const child = spawn(python, [path.join(__dirname, 'manage.py'), ...args], { cwd: __dirname, stdio: 'inherit', env: process.env });
child.on('error', err => { console.error(err.message); process.exit(1); });
child.on('exit', code => process.exit(code === null ? 1 : code));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
