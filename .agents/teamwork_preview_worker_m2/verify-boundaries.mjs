import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../');
const publicApiSrc = path.join(projectRoot, 'apps/public-api/src');
const adminApiSrc = path.join(projectRoot, 'apps/admin-api/src');

console.log('=== Starting Comprehensive ESLint Boundary Verification ===\n');

let allPassed = true;

// 1. Verify baseline (no cross imports)
console.log('1. Checking baseline lint status...');
try {
  execSync('pnpm --filter public-api lint', { cwd: projectRoot, encoding: 'utf8' });
  console.log('   public-api baseline: PASSED (0 errors)');
} catch (err) {
  console.error('   public-api baseline FAILED unexpectedly:', err.stdout || err.message);
  allPassed = false;
}

try {
  execSync('pnpm --filter admin-api lint', { cwd: projectRoot, encoding: 'utf8' });
  console.log('   admin-api baseline: PASSED (0 errors)');
} catch (err) {
  console.error('   admin-api baseline FAILED unexpectedly:', err.stdout || err.message);
  allPassed = false;
}

// Helper to test illegal import variants
function testIllegalImport(appName, appSrcDir, importStatement, expectedAppForbidden) {
  const tempFile = path.join(appSrcDir, `_temp_test_import_${Date.now()}.ts`);
  const fileContent = `${importStatement}\nconsole.log(1);\n`;
  const filterFlag = `--filter ${appName}`;
  const expectedMsg = `Cross-app imports from ${expectedAppForbidden} into ${appName} are strictly forbidden`;

  try {
    fs.writeFileSync(tempFile, fileContent, 'utf8');
    let caughtError = false;
    try {
      execSync(`pnpm ${filterFlag} lint`, { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
    } catch (err) {
      caughtError = true;
      const output = (err.stdout || '') + (err.stderr || '');
      if (output.includes(expectedMsg) && output.includes('no-restricted-imports')) {
        console.log(`   [PASS] ${appName} blocked: "${importStatement.trim()}"`);
      } else {
        console.error(`   [FAIL] ${appName} unexpected lint output for: "${importStatement.trim()}". Output:\n`, output);
        allPassed = false;
      }
    }
    if (!caughtError) {
      console.error(`   [FAIL] ${appName} DID NOT BLOCK: "${importStatement.trim()}"`);
      allPassed = false;
    }
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

// 2. Negative Test Suite: public-api importing admin-api
console.log('\n2. Testing public-api boundary (must block admin-api imports)...');
const publicApiTestVariants = [
  "import { auditLogger } from '../../admin-api/src/middleware/audit';",
  "import { cms } from '../../admin-api';",
  "import { helper } from 'admin-api';",
  "import type { AdminType } from '../../admin-api/src/types';"
];

for (const variant of publicApiTestVariants) {
  testIllegalImport('public-api', publicApiSrc, variant, 'admin-api');
}

// 3. Negative Test Suite: admin-api importing public-api
console.log('\n3. Testing admin-api boundary (must block public-api imports)...');
const adminApiTestVariants = [
  "import { checkout } from '../../public-api/src/routes/checkout';",
  "import { pub } from '../../public-api';",
  "import { helper } from 'public-api';",
  "import type { PublicType } from '../../public-api/src/types';"
];

for (const variant of adminApiTestVariants) {
  testIllegalImport('admin-api', adminApiSrc, variant, 'public-api');
}

console.log('\n=== Verification Summary ===');
if (allPassed) {
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('VERIFICATION FAILED!');
  process.exit(1);
}
