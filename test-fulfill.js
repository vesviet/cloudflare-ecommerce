const { execSync } = require('child_process');

try {
  console.log("=== SQLITE SCHEMA ===");
  const schema = execSync('npx wrangler d1 execute ecommerce-db --local --json --command "SELECT sql FROM sqlite_master WHERE type=\'table\';"', { cwd: 'apps/public-api' });
  console.log(schema.toString());
} catch (err) {
  console.error("Error executing command:", err.message);
}
