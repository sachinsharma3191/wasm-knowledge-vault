import { putImageEmbedding } from '../storage/store'

type ProgressCB = (p: { queued: number; done: number }) => void
let cb: ProgressCB | null = null

let worker: Worker | null = null
function getWorker() {
    if (!worker) worker = new Worker(new URL('../../workers/clip-worker.ts', import.meta.url), { type: 'module' })
    return worker
}

const queue: Array<{ kind: 'image'; id: string; imageData: ImageData } | { kind: 'text'; id: string; text: string; resolve: (v: Float32Array) => void; reject: (e:any)=>void }> = []
let running = 0
const maxParallel = 1

function update() { cb?.({ queued: queue.length, done: 0 }) }

async function runNext() {
    if (running >= maxParallel || queue.length === 0) return
    const item = queue.shift()!
    running++
    update()

    const w = getWorker()
    w.onmessage = (e: MessageEvent<any>) => {
        const msg = e.data
        if (msg.type === 'ok') {
            const vec = new Float32Array(msg.vec)
            if (item.kind === 'image') {
                putImageEmbedding(item.id, vec).catch(console.error)
            } else {
                item.resolve(vec)
            }
        } else if (item.kind === 'text') {
            item.reject(new Error(msg.error || 'clip text embed failed'))
        }
        running--
        update()
        runNext()
    }
    w.onerror = (err) => { console.error(err); running--; runNext() }

    if (item.kind === 'image') {
        w.postMessage({ type: 'image-embed', id: item.id, imageData: item.imageData })
    } else {
        w.postMessage({ type: 'text-embed', id: item.id, text: item.text })
    }
}

export function onClipProgress(fn: ProgressCB) {
    cb = fn; update()
    return () => { if (cb === fn) cb = null }
}

export async function enqueueImageEmbedding(id: string, imageData: ImageData) {
    queue.push({ kind: 'image', id, imageData }); runNext()
}

export function embedTextOnce(id: string, text: string): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
        queue.push({ kind: 'text', id, text, resolve, reject }); runNext()
    })
}