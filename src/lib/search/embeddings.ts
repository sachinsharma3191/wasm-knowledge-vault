import { pipeline, env } from '@xenova/transformers'

    /** Choose the web/ONNX backend without overwriting the object */
    ;(env as any).backend ??= 'onnx'     // prefer ONNX Runtime in browser

// Optional: only if you want to tweak WASM—create nested objects first
;(env as any).backends ??= {}
;(env as any).backends.onnx ??= {}
;(env as any).backends.onnx.wasm ??= {}
;(env as any).backends.onnx.wasm.proxy = false
;(env as any).backends.onnx.wasm.numThreads = 1

// Local models (if you prefetch to /public/models)
env.allowLocalModels = true
env.localModelPath = '/models'

let _fe: Promise<any> | null = null
export async function embedTextReal(text: string): Promise<Float32Array> {
    if (!_fe) _fe = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    const fe = await _fe
    const out = await fe(text, { pooling: 'mean', normalize: true })
    const data: Float32Array = (out as any).data ?? (out as any)
    return new Float32Array(data)
}