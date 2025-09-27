/// <reference lib="webworker" />
import { pipeline } from '@xenova/transformers'

// One pipeline for both text and images (CLIP)
let pipe: any
async function getPipe() {
    if (!pipe) {
        pipe = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', { quantized: true })
    }
    return pipe
}

type MsgIn =
    | { type: 'text-embed'; text: string; id: string }
    | { type: 'image-embed'; imageData: ImageData; id: string }

type MsgOut =
    | { type: 'ok'; id: string; vec: number[] }
    | { type: 'error'; id: string; error: string }

self.addEventListener('message', async (e: MessageEvent<MsgIn>) => {
    const msg = e.data
    try {
        const p = await getPipe()
        if (msg.type === 'text-embed') {
            const out = await p(msg.text, { pooling: 'mean', normalize: true })
            ;(self as any).postMessage({ type: 'ok', id: msg.id, vec: Array.from(out.data) } as MsgOut)
        } else if (msg.type === 'image-embed') {
            const out = await p(msg.imageData, { pooling: 'mean', normalize: true })
            ;(self as any).postMessage({ type: 'ok', id: msg.id, vec: Array.from(out.data) } as MsgOut)
        }
    } catch (err: any) {
        ;(self as any).postMessage({ type: 'error', id: (msg as any).id, error: String(err) } as MsgOut)
    }
})