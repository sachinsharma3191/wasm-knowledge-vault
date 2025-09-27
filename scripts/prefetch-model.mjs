// scripts/prefetch-model.mjs
import { pipeline, env } from '@xenova/transformers'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

// Where to store the files so they’re served by Vite/your PWA:
const PUBLIC_MODELS_DIR = path.resolve(__dirname, '../public/models')
// The model we’ll use:
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'

async function main() {
    // Make sure target folder exists
    await mkdir(PUBLIC_MODELS_DIR, { recursive: true })

    // Tell Transformers.js to cache into /public/models
    env.allowLocalModels = true
    env.cacheDir = PUBLIC_MODELS_DIR

    // Force ONNX Runtime (WASM) artifacts
    ;(env.backends ??= {}).onnx ??= {}
    env.backends.onnx.wasm ??= {}
    env.backends.onnx.wasm.proxy = false
    env.backends.onnx.wasm.numThreads = 1

    // Trigger a one-time download of the model into cacheDir
    console.log(`⇣ Downloading ${MODEL_ID} into ${PUBLIC_MODELS_DIR} ...`)
    const fe = await pipeline('feature-extraction', MODEL_ID)
    // Warm up once to make sure all sub-assets are fetched
    await fe('warmup', { pooling: 'mean', normalize: true })

    console.log('✔ Model cached locally.')
    console.log(`   Path: ${PUBLIC_MODELS_DIR}/${MODEL_ID}`)
    console.log('   You can now run the app fully offline.')
}

main().catch((e) => {
    console.error('Prefetch failed:', e)
    process.exit(1)
})