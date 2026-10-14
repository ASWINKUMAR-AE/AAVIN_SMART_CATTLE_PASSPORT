const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const moduleUnderTest = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('services/navigation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(code, { module: moduleUnderTest, exports: moduleUnderTest.exports });
const { goBackOrReplace } = moduleUnderTest.exports;

for (const fallback of ['/(booth)', '/(booth)/farmers', '/(veterinary)/cattle-registry']) {
  const calls = [];
  let hasHistory = true;
  const router = {
    canGoBack: () => hasHistory,
    back: () => { calls.push('back'); hasHistory = false; },
    replace: route => calls.push(route),
  };
  goBackOrReplace(router, fallback);
  assert.deepEqual(calls, ['back']);
  // A second press after returning to the root must not dispatch GO_BACK.
  goBackOrReplace(router, fallback);
  assert.deepEqual(calls, ['back', fallback]);
  calls.length = 0;
  // A direct link or reload starts with no navigation history.
  goBackOrReplace(router, fallback);
  assert.deepEqual(calls, [fallback]);
}
console.log('Navigation checks passed: existing history, root return, and direct-link fallbacks.');
