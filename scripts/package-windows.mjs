// Use this script with: PLATFORM=win32 PROCESSOR_ARCHITECTURE=x64 node scripts/package-windows.mjs
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = {
  name: 'package-windows',
  async run() {
    const { build } = require('electron-builder')
    const result = await build({
      targets: ['nsis'],
      config: {
        appId: 'com.universalinspection.quoteflowpro',
        productName: 'QuoteFlow Pro',
        copyright: 'Copyright © 2026 Universal Inspection Co. Ltd.',
        directories: {
          output: 'dist/releases',
          buildResources: 'build',
        },
        files: [
          'dist/**/*',
          'electron/**/*',
          'package.json',
          // Explicitly include electron-updater and its required dependencies
          'node_modules/electron-updater/**',
          'node_modules/fetch-blob/**',
          'node_modules/gaxios/**',
          'node_modules/ecdsa-sig-formatter/**',
          'node_modules/@jridgewell/trace-mapping/**',
          'node_modules/@emnapi/wasi-threads/**',
          'node_modules/@emnapi/core/**',
          'node_modules/@emnapi/runtime/**',
          'node_modules/@tybys/wasm-util/**',
          'node_modules/@types/node/**',
          'node_modules/lightningcss/**',
          'node_modules/@jridgewell/gen-mapping/**',
          'node_modules/@jridgewell/trace-mapping/**',
        ],
        extraMetadata: {
          version: '3.0.0',
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: 'QuoteFlow Pro',
          uninstallDisplayName: 'QuoteFlow Pro',
          license: 'build/license.txt',
          installerIcon: 'build/icon.ico',
          uninstallerIcon: 'build/icon.ico',
          installerHeaderIcon: 'build/icon.ico',
          perMachine: false,
          runAfterFinish: true,
        },
        compression: 'maximum',
        publish: {
          provider: 'github',
          owner: 'universalinspectionco',
          repo: 'Quotation-Manager-V2',
        },
      },
    })
    console.log('Build completed:', result)
  },
}