/**
 * Aavin Smart Cattle Passport - Unified Dev Runner
 * Auto-detects LAN IP, displays Expo Go QR Code in Terminal, and runs Django + Expo concurrently.
 */
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();
const metroWebUrl = `http://localhost:8081`;
const portalWebUrl = `http://localhost:4000/admin/`;
const portalLanUrl = `http://${localIp}:4000/admin/`;
const backendApiUrl = `http://${localIp}:4000/api/v1`;

function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    require('child_process').exec(`${startCmd} "${url}"`);
  } catch (_) {}
}

console.clear();
console.log('\x1b[36m%s\x1b[0m', '========================================================================');
console.log('\x1b[1m\x1b[32m%s\x1b[0m', '  🐄 AAVIN SMART CATTLE PASSPORT — UNIFIED SYSTEM RUNNER');
console.log('\x1b[36m%s\x1b[0m', '========================================================================');
console.log('  Scan the QR code printed by EXPO_MOBILE after its server is ready.');

console.log('\x1b[32m%s\x1b[0m', `  🌐 Django Admin (Local):    ${portalWebUrl}`);
console.log('\x1b[32m%s\x1b[0m', `  🌐 Django Admin (LAN):      ${portalLanUrl}`);
console.log('  Phone connection troubleshooting: npm run mobile');
console.log(`  💻 Metro Dev Tools:          ${metroWebUrl}`);
console.log(`  🚀 Backend API & WebSocket:  ${backendApiUrl}`);
console.log('\x1b[36m%s\x1b[0m', '------------------------------------------------------------------------');
console.log(`  ✨ Automatically opening Django Admin in browser in 2 seconds...`);
console.log('\x1b[36m%s\x1b[0m', '========================================================================\n');

// Auto open Django Admin in browser
setTimeout(() => {
  openBrowser(portalWebUrl);
}, 2000);

// Run Concurrently
const concurrently = require('concurrently');

concurrently(
  [
    {
      command: 'npm --prefix backend run dev',
      name: 'DJANGO_API',
      prefixColor: 'blue',
    },
    {
      command: process.argv.includes('--tunnel')
        ? 'npx expo start --go --tunnel --clear'
        : 'npx expo start --go --host lan',
      name: 'EXPO_MOBILE',
      prefixColor: 'green',
    },
  ],
  {
    prefix: 'name',
    // A local API failure must not disconnect phones using the hosted API.
    killOthers: [],
    restartTries: 0,
  }
).result.then(
  () => process.exit(0),
  (err) => {
    console.error('Process error:', err);
    process.exit(1);
  }
);
