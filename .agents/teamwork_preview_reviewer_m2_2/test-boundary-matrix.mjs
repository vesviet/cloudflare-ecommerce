import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../');
const publicApiSrc = path.join(projectRoot, 'apps/public-api/src');
const adminApiSrc = path.join(projectRoot, 'apps/admin-api/src');

console.log('=== Reviewer 2: ESLint Boundary Test Matrix ===\n');

let allPassed = true;
const results = [];

// 1. Baseline
console.log('1. Verifying baseline clean linting...');
try {
  const out1 = execSync('pnpm --filter public-api lint', { cwd: projectRoot, encoding: 'utf8' });
  console.log('  [PASS] public-api baseline: 0 errors');
  results.push({ test: 'public-api baseline', status: 'PASS', details: '0 errors' });
} catch (err) {
  console.error('  [FAIL] public-api baseline error:', err.stdout || err.message);
  results.push({ test: 'public-api baseline', status: 'FAIL', details: err.stdout || err.message });
  allPassed = false;
}

try {
  const out2 = execSync('pnpm --filter admin-api lint', { cwd: projectRoot, encoding: 'utf8' });
  console.log('  [PASS] admin-api baseline: 0 errors');
  results.push({ test: 'admin-api baseline', status: 'PASS', details: '0 errors' });
} catch (err) {
  console.error('  [FAIL] admin-api baseline error:', err.stdout || err.message);
  results.push({ test: 'admin-api baseline', status: 'FAIL', details: err.stdout || err.message });
  allPassed = false;
}

function runTestCase(appName, appSrcDir, importStatement, expectedForbiddenTarget) {
  const testFileName = `_reviewer_matrix_test_${Date.now()}_${Math.floor(Math.random()*1000)}.ts`;
  const tempFile = path.join(appSrcDir, testFileName);
  const fileContent = `${importStatement}\nconsole.log(1);\n`;
  const filterFlag = `--filter ${appName}`;
  const expectedMsg = `Cross-app imports from ${expectedForbiddenTarget} into ${appName} are strictly forbidden`;

  try {
    fs.writeFileSync(tempFile, fileContent, 'utf8');
    let caughtError = false;
    try {
      execSync(`pnpm ${filterFlag} lint`, { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
    } catch (err) {
      caughtError = true;
      const output = (err.stdout || '') + (err.stderr || '');
      if (output.includes(expectedMsg) && output.includes('no-restricted-imports')) {
        console.log(`  [PASS] ${appName} correctly BLOCKED: "${importStatement.trim()}"`);
        results.push({ test: `${appName}: ${importStatement.trim()}`, status: 'PASS', message: expectedMsg });
      } else {
        console.error(`  [FAIL] ${appName} UNEXPECTED OUTPUT for: "${importStatement.trim()}":\n${output}`);
        results.push({ test: `${appName}: ${importStatement.trim()}`, status: 'FAIL', output });
        allPassed = false;
      }
    }
    if (!caughtError) {
      console.error(`  [FAIL] ${appName} DID NOT BLOCK: "${importStatement.trim()}"`);
      results.push({ test: `${appName}: ${importStatement.trim()}`, status: 'FAIL', output: 'Import allowed without error' });
      allPassed = false;
    }
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

console.log('\n2. Testing public-api boundary against admin-api imports...');
const publicApiCases = [
  "import { auditLogger } from '../../admin-api/src/middleware/audit';",
  "import { cms } from '../../admin-api';",
  "import { helper } from 'admin-api';",
  "import { helper } from 'admin-api/src/helper';",
  "import type { AdminType } from '../../admin-api/src/types';",
  "import { auditLogger } from '../../admin-api/src/middleware/audit?bypass=true';"
];

for (const c of publicApiCases) {
  runTestCase('public-api', publicApiSrc, c, 'admin-api');
}

console.log('\n3. Testing admin-api boundary against public-api imports...');
const adminApiCases = [
  "import { checkout } from '../../public-api/src/routes/checkout';",
  "import { pub } from '../../public-api';",
  "import { helper } from 'public-api';",
  "import { helper } from 'public-api/src/helper';",
  "import type { PublicType } from '../../public-api/src/types';",
  "import { checkout } from '../../public-api/src/routes/checkout?bypass=true';"
];

for (const c of adminApiCases) {
  runTestCase('admin-api', adminApiSrc, c, 'public-api');
}

console.log('\n=== Test Matrix Summary ===');
if (allPassed) {
  console.log('ALL 14 TEST CASES PASSED!');
  process.exit(0);
} else {
  console.error('SOME TEST CASES FAILED!');
  process.exit(1);
}
