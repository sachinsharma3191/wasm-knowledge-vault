import EmbedWorkerURL from '../../workers/embed.worker.ts?worker&url'
import { putEmbedding } from '../storage/store'

type Job = { id: string; text: string }
type Listener = (progress: { queued: number; done: number }) => void

let worker: Worker | null = null
let queue: Job[] = []
let done = 0
const listeners = new Set<Listener>()
let busy = false

export function onProgress(cb: Listener) { listeners.add(cb); cb({queued: queue.length, done}); return () => listeners.delete(cb) }
function notify() { const p = { queued: queue.length, done }; listeners.forEach(l => l(p)) }

function ensureWorker() {
    if (worker) return worker
    worker = new Worker(EmbedWorkerURL, { type: 'module' })
    worker.onmessage = async (e: MessageEvent<any>) => {
        const msg = e.data
        if (msg.type === 'EMBEDDED') {
            await putEmbedding(msg.id, new Float32Array(msg.vec))
            done++
            notify()
            busy = false
            pump()
        } else if (msg.type === 'ERROR') {
            console.error('Embedding error', msg)
            done++
            busy = false
            pump()
        }
    }
    worker.postMessage({ type: 'PING' })
    return worker
}

export function enqueue(id: string, text: string) {
    queue.push({ id, text })
    notify()
    pump()
}

function pump() {
    ensureWorker()
    if (busy) return
    const job = queue.shift()
    if (!job) return
    busy = true
    worker!.postMessage({ type: 'EMBED', id: job.id, text: job.text })
}

export function resetProgress() { queue = []; done = 0; notify() }