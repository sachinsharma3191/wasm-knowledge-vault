import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from "node:path";

export default defineConfig({
    plugins: [react()],
    build: {
        target: 'es2022',
        commonjsOptions: { transformMixedEsModules: true },
    },
    optimizeDeps: {
        // don't prebundle these (they do dynamic ESM)
        exclude: ['@xenova/transformers', '@xenova/transformers/dist/transformers.min.js','onnxruntime-web'],
    },
    assetsInclude: ['**/*.wasm'],
    define: {
        'process.env': {},
        global: 'globalThis',
    },
    resolve: {
        alias: {
            // 👇 Force the package root to the browser-only bundle
            '@xenova/transformers': path.resolve(
                __dirname,
                'node_modules/@xenova/transformers/dist/transformers.min.js'
            ),
        },
    },
})