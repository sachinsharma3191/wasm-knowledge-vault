// src/workers/embed.worker.ts
// Web Worker that computes sentence embeddings and posts them back.

import { pipeline, env } from '@xenova/transformers'

// Backend & model config (browser only)
    ;(env as any).backend ??= 'onnx'
env.allowLocalModels = true
env.localModelPath = '/models'

let fePromise: Promise<any> | null = null
async function getFE() {
    if (!fePromise) {
        fePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    }
    return fePromise
}

type MsgIn =
    | { type: 'PING' }
    | { type: 'EMBED'; id: string; text: string }

type MsgOut =
    | { type: 'READY' }
    | { type: 'EMBEDDED'; id: string; vec: Float32Array }
    | { type: 'ERROR'; id?: string; error: string }

// Note: self is the DedicatedWorkerGlobalScope
self.onmessage = async (e: MessageEvent<MsgIn>) => {
    const msg = e.data
    try {
        if (msg.type === 'PING') {
            ;(self as any).postMessage({ type: 'READY' } as MsgOut)
            return
        }

        if (msg.type === 'EMBED') {
            const fe = await getFE()
            const out = await fe(msg.text, { pooling: 'mean', normalize: true })
            const data: Float32Array = (out as any).data ?? (out as any)

            // Clone so we can transfer the buffer (zero-copy to main thread)
            const vec = new Float32Array(data)
            ;(self as any).postMessage(
                { type: 'EMBEDDED', id: msg.id, vec } as MsgOut,
                [vec.buffer]
            )
            return
        }
    } catch (err: any) {
        ;(self as any).postMessage(
            { type: 'ERROR', id: (msg as any)?.id, error: String(err) } as MsgOut
        )
    }
}