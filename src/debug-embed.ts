import { env, pipeline } from '@xenova/transformers'

// Force ONNX backend (skip tfjs entirely)
    ;(env as any).backends = ['onnx']

async function test() {
    try {
        const fe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
        const out = await fe('hello world', { pooling: 'mean', normalize: true })
        console.log('✅ embedding works:', out)
    } catch (err) {
        console.error('❌ embedding test failed:', err)
    }
}

test()