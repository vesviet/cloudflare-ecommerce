import { defineConfig } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

const tmpDir = path.resolve(__dirname, '../../tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
process.env.TMPDIR = tmpDir;

export default defineConfig({
  cacheDir: 'node_modules/.vite',
  test: {
    environment: 'node',
  },
});
