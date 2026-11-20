import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔨 Building QuoteFlow Pro for Windows...');

try {
  console.log('→ Running vite build...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('→ Packaging with electron-builder...');
  const cmd = `npx electron-builder --win --x64 --config electron-builder.json`;
  execSync(cmd, { stdio: 'inherit' });

  console.log('✅ Windows package complete!');
} catch (e) {
  console.error('❌ Build failed:', e.message);
  process.exit(1);
}
