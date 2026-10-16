import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import vitePluginBundleObfuscator  from 'vite-plugin-bundle-obfuscator'
export default defineConfig({
  plugins: [
    react(), tailwindcss(),
    vitePluginBundleObfuscator({
      apply: 'build',              // only production builds
      autoExcludeNodeModules: true,
      threadPool: true,
      options: {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: false,  // costly; keep off unless you need it
        debugProtection: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
