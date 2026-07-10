const fs = require('fs');
const path = require('path');

const adminWranglerPath = path.resolve(__dirname, '../apps/admin-api/.wrangler');
const publicWranglerPath = path.resolve(__dirname, '../apps/public-api/.wrangler');

console.log("🔗 Preparing database sharing symlink...");

try {
  if (fs.existsSync(adminWranglerPath)) {
    console.log("Removing existing admin-api wrangler folder...");
    fs.rmSync(adminWranglerPath, { recursive: true, force: true });
  }
  
  console.log("Creating symlink from admin-api/.wrangler to ../public-api/.wrangler...");
  fs.symlinkSync('../public-api/.wrangler', adminWranglerPath, 'dir');
  console.log("✅ Database sharing symlink created successfully!");
} catch (err) {
  console.error("❌ Error setting up symlink:", err.message);
  process.exit(1);
}
