import { execSync } from 'child_process';

console.log('🔨 Building QuoteFlow Pro for macOS...');

try {
  console.log('→ Running vite build...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('→ Packaging with electron-builder...');
  const cmd = `npx electron-builder --mac --x64 --config electron-builder.json`;
  execSync(cmd, { stdio: 'inherit' });

  console.log('✅ macOS package complete!');
} catch (e) {
  console.error('❌ Build failed:', e.message);
  process.exit(1);
}
