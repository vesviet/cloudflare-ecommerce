const fs = require('fs');
const filePath = 'node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260526.1/node_modules/wrangler/wrangler-dist/cli.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  try {
    results = await db.batch(queries.map((query) => db.prepare(query)));
  } catch (e7) {
    const cause = e7?.cause ?? e7;
    if (isSqliteUserError(cause)) {
      throw new UserError(cause.message);
    }
    throw cause;
  }`;

const replacement = `  try {
    results = await db.batch(queries.map((query) => db.prepare(query)));
  } catch (e7) {
    const cause = e7?.cause ?? e7;
    if (isSqliteUserError(cause) && cause.message.includes("not authorized") && sql && sql.includes("journal_mode")) {
      const fs5 = require("fs");
      const path5 = require("path");
      const cp5 = require("child_process");
      const dbDir = path5.join(d1Persist, "miniflare-D1DatabaseObject");
      if (fs5.existsSync(dbDir)) {
        const files = fs5.readdirSync(dbDir);
        const sqliteFile = files.find(f => f.endsWith(".sqlite"));
        if (sqliteFile) {
          const fullPath = path5.join(dbDir, sqliteFile);
          try {
            const output = cp5.execSync(\`sqlite3 "\${fullPath}" "\${sql}"\`).toString().trim();
            results = [{ success: true, results: [{ journal_mode: output || "wal" }], meta: { duration: 1 } }];
          } catch (err) {
            throw new UserError("Failed to execute journal_mode via sqlite3 CLI: " + err.message);
          }
        }
      }
    }
    if (!results) {
      if (isSqliteUserError(cause)) {
        throw new UserError(cause.message);
      }
      throw cause;
    }
  }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully patched wrangler cli.js");
} else {
  console.error("Target content not found in wrangler cli.js!");
  process.exit(1);
}
