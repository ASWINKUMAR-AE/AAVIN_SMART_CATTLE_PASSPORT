// Isolated React Native Web layout checks. Never contacts the real backend.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const tools = process.env.BOOTH_UI_TOOLS || '/tmp/booth-ui-tools/node_modules';
const esbuild = require(path.join(tools, 'esbuild'));
const { chromium } = require(path.join(tools, 'playwright-core'));
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'booth-layout-'));
const fixture = name => path.join(__dirname, 'booth-ui', name);
const results = [];
let browser, server;
const html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%}#root{display:flex;flex-direction:column}body{overflow:hidden}</style><div id="root"></div><script src="/entry.js"></script>';
async function footerCheck(page, label) {
  return page.getByText(label, { exact: true }).last().evaluate(element => {
    const button = element.closest('[tabindex]') || element;
    const bounds = button.getBoundingClientRect();
    return { footerInViewport: bounds.top >= -2 && bounds.bottom <= innerHeight + 2,
      footerBounds: { top: Math.round(bounds.top), bottom: Math.round(bounds.bottom) } };
  });
}
async function main() {
  await esbuild.build({ entryPoints: [fixture('entry.jsx')], bundle: true, outfile: path.join(output, 'entry.js'),
    platform: 'browser', nodePaths: [path.join(root, 'node_modules')], loader: { '.png': 'dataurl' },
    define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'true' }, plugins: [{ name: 'isolated-ui', setup(build) {
      build.onResolve({ filter: /^react-native$/ }, () => ({ path: fixture('native.jsx') }));
      build.onResolve({ filter: /context\/(Auth|Theme|Language|Scroll|MilkCollections)Context$|store\/AavinStoreContext$|services\/(accountsApi|milkCollectionsApi)$|^expo-router$|^react-native-safe-area-context$/ },
        () => ({ path: fixture('mocks.jsx') }));
      build.onResolve({ filter: /^@expo\/vector-icons$|^react-native-svg$|^expo-haptics$|ui\/PressableScale$|^\.\/PressableScale$/ },
        () => ({ path: fixture('platform.jsx') }));
    } }] });
  const bundle = fs.readFileSync(path.join(output, 'entry.js'));
  server = http.createServer((request, response) => {
    response.setHeader('Content-Type', request.url.startsWith('/entry.js') ? 'text/javascript' : 'text/html');
    response.end(request.url.startsWith('/entry.js') ? bundle : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: process.env.BOOTH_UI_CHROME || '/usr/bin/google-chrome',
    headless: true, args: ['--no-sandbox'] });
  const viewports = process.env.BOOTH_UI_VIEWPORTS
    ? JSON.parse(process.env.BOOTH_UI_VIEWPORTS)
    : [[320, 568], [360, 800], [390, 844], [412, 915], [768, 1024], [1024, 768], [568, 320]];
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const fontScale of [1, 1.5]) for (const theme of ['light', 'dark']) {
      const screens = process.env.BOOTH_UI_SCREENS ? JSON.parse(process.env.BOOTH_UI_SCREENS) : ['home', 'farmers', 'profile', 'milk', 'review', 'receipt', 'sent'];
      for (const screen of screens) {
        errors.length = 0;
        await page.goto(`http://127.0.0.1:${server.address().port}/?screen=${screen}&fontScale=${fontScale}&theme=${theme}`);
        await page.waitForTimeout(180);
        if (screen === 'milk') {
          await page.getByText('Select Farmer ▾', { exact: true }).click();
          await page.waitForTimeout(100);
        }
        const checks = await page.evaluate(() => {
          const overflow = [];
          for (const element of document.querySelectorAll('div,span,input')) {
            const bounds = element.getBoundingClientRect();
            if (!bounds.width || !bounds.height || getComputedStyle(element).visibility === 'hidden') continue;
            let intentionalScroll = false;
            for (let parent = element.parentElement; parent; parent = parent.parentElement) {
              const style = getComputedStyle(parent);
              if (['auto', 'scroll'].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth + 2) {
                intentionalScroll = true;
                break;
              }
            }
            if (!intentionalScroll && (bounds.left < -2 || bounds.right > innerWidth + 2)) {
              overflow.push({ text: element.textContent.slice(0, 70), left: Math.round(bounds.left), right: Math.round(bounds.right) });
            }
          }
          const text = document.body.innerText;
          return { overflow: overflow.slice(0, 5), blank: text.trim().length < 20,
            uuidLeak: /[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/i.test(text),
            visibleTabs: document.querySelectorAll('[data-testid^="tab-"]').length };
        });
        results.push({ screen, width, height, fontScale, theme, ...checks, errors: [...errors] });
        if (width === 320 && fontScale === 1 && theme === 'light' || width === 768 && fontScale === 1.5 && theme === 'dark') {
          await page.screenshot({ path: path.join(output, `${screen}-${width}-${fontScale}-${theme}.png`) });
        }
        if (screen === 'farmers') {
          for (const [name, label] of [['edit', 'Edit Details'], ['register', '+ Register Farmer']]) {
            await page.getByText(label, { exact: true }).first().click();
            await page.waitForTimeout(400); // Wait for the native-web modal's slide animation.
            results.push({ screen: `farmers-${name}`, width, height, fontScale, theme,
              ...await footerCheck(page, name === 'edit' ? 'Save Changes' : 'Enroll (1 Cows)') });
            if (width === 320 || width === 568) await page.screenshot({ path: path.join(output, `farmers-${name}-${width}-${fontScale}-${theme}.png`) });
            await page.getByText('Cancel', { exact: true }).last().click();
            await page.waitForTimeout(300);
          }
        }
        if (screen === 'sent') {
          await page.getByText('View Details', { exact: true }).first().click();
          await page.waitForTimeout(400);
          results.push({ screen: 'sent-details', width, height, fontScale, theme, ...await footerCheck(page, 'Close') });
          if (width === 320) await page.screenshot({ path: path.join(output, `sent-details-${width}-${fontScale}-${theme}.png`) });
          await page.getByText('Close', { exact: true }).last().click();
          await page.waitForTimeout(300);
        }
      }
    }
    console.log(`Checked ${width}x${height}`);
    await page.close();
  }
  const failures = results.filter(result => result.overflow?.length || result.blank || result.uuidLeak || result.errors?.length ||
    result.footerInViewport === false || result.visibleTabs !== undefined && result.visibleTabs !== 4);
  console.log(JSON.stringify({ cases: results.length, failures: failures.length, examples: failures.slice(0, 8), output }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  if (server) server.close();
});
