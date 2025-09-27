import { useState } from 'react'
import { decodeToMono16k } from '../lib/asr/audio'
import { transcribeFloat32 } from '../lib/asr/asr-client'
import { ask } from '../lib/qa/ask' // your existing RAG ask()

export default function VoiceQA() {
    const [rec, setRec] = useState<MediaRecorder | null>(null)
    const [chunks, setChunks] = useState<Blob[]>([])
    const [status, setStatus] = useState<'idle'|'rec'|'proc'>('idle')
    const [text, setText] = useState('')
    const [answer, setAnswer] = useState<string>('')

    async function start() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        setChunks([])
        mr.ondataavailable = e => { if (e.data.size) setChunks(prev => prev.concat(e.data)) }
        mr.onstop = async () => {
            setStatus('proc')
            try {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                const pcm16k = await decodeToMono16k(blob)
                const t = await transcribeFloat32(pcm16k, 16000)
                setText(t)
                const res = await ask(t)
                setAnswer(res.answer)
            } catch (e) {
                console.error(e)
            } finally {
                setStatus('idle')
            }
        }
        mr.start()
        setRec(mr); setStatus('rec')
    }
    function stop() { rec?.stop(); rec?.stream.getTracks().forEach(t=>t.stop()); setRec(null) }

    return (
        <section style={{ marginTop: 24 }}>
            <h2>Voice Q&A</h2>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {status !== 'rec' ? <button onClick={start}>🎤 Start</button> : <button onClick={stop}>■ Stop</button>}
                <span style={{ fontSize:12, opacity:.7 }}>{status === 'rec' ? 'Recording…' : status === 'proc' ? 'Transcribing…' : ''}</span>
            </div>
            {text && (
                <div style={{ marginTop:8 }}>
                    <div><strong>Heard:</strong> {text}</div>
                    {answer && <div style={{ marginTop:6 }}><strong>Answer:</strong> {answer}</div>}
                </div>
            )}
        </section>
    )
}