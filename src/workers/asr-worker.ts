/// <reference lib="webworker" />
import { pipeline } from '@xenova/transformers'

let asr: any
async function getASR() {
    if (!asr) asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', { quantized: true })
    return asr
}

type MsgIn = { type: 'transcribe'; id: string; audio: Float32Array; sr: number }
type MsgOut = { type: 'ok'; id: string; text: string } | { type: 'error'; id: string; error: string }

self.addEventListener('message', async (e: MessageEvent<MsgIn>) => {
    const m = e.data
    if (m.type !== 'transcribe') return
    try {
        const pipe = await getASR()
        const out = await pipe({ array: m.audio, sampling_rate: m.sr })
        ;(self as any).postMessage({ type:'ok', id: m.id, text: out.text } as MsgOut)
    } catch (err: any) {
        ;(self as any).postMessage({ type:'error', id: m.id, error: String(err) } as MsgOut)
    }
})