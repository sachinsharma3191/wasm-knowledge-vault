let worker: Worker | null = null
function getWorker() {
    if (!worker) worker = new Worker(new URL('../../workers/asr-worker.ts', import.meta.url), { type:'module' })
    return worker
}

export function transcribeFloat32(audio: Float32Array, sr = 16000): Promise<string> {
    return new Promise((resolve, reject) => {
        const id = 'asr_'+Math.random().toString(36).slice(2)
        const w = getWorker()
        const handler = (e: MessageEvent<any>) => {
            const msg = e.data
            if (msg.id !== id) return
            w.removeEventListener('message', handler)
            if (msg.type === 'ok') resolve(msg.text)
            else reject(new Error(msg.error))
        }
        w.addEventListener('message', handler)
        w.postMessage({ type:'transcribe', id, audio, sr })
    })
}