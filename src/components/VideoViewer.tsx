import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import { getMediaBlob, getMediaURL, listMediaByPrefix } from '../lib/storage/store'
import {parseVideoKey, videoKeyForBase} from "../lib/media/video-id.ts";

export default function VideoViewer() {
    const { baseId = '' } = useParams()
    const [sp] = useSearchParams()
    const startSec = parseFloat(sp.get('t') || '0') || 0

    const videoRef = useRef<HTMLVideoElement>(null)
    const [src, setSrc] = useState<string>('')
    const [frames, setFrames] = useState<{ ms: number; url: string }[]>([])

    useEffect(() => {
        let gone = false
        ;(async () => {
            const blob = await getMediaBlob(videoKeyForBase(baseId))
            if (!blob) return
            const url = URL.createObjectURL(blob)
            if (!gone) setSrc(url)
            // load sampled frames for strip
            const ids = await listMediaByPrefix(`vframe:${baseId}:t`)
            ids.sort((a,b) => (parseVideoKey(a).ms || 0) - (parseVideoKey(b).ms || 0))
            const out: { ms: number; url: string }[] = []
            for (const id of ids) {
                const u = await getMediaURL(id)
                if (u) out.push({ ms: parseVideoKey(id).ms || 0, url: u })
            }
            if (!gone) setFrames(out)
        })()
        return () => { gone = true; if (src) URL.revokeObjectURL(src); frames.forEach(f => URL.revokeObjectURL(f.url)) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseId])

    useEffect(() => {
        const v = videoRef.current
        if (v && !Number.isNaN(startSec)) {
            const seek = () => { v.currentTime = startSec }
            v.addEventListener('loadedmetadata', seek, { once: true })
            return () => v.removeEventListener('loadedmetadata', seek)
        }
    }, [startSec])

    function jump(ms: number) {
        const v = videoRef.current
        if (v) v.currentTime = ms / 1000
    }

    return (
        <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:12, padding:16 }}>
            <div style={{ overflowY:'auto', maxHeight:'calc(100vh - 32px)', borderRight:'1px solid #eee', paddingRight:8 }}>
                <Link to="/">← Back</Link>
                <h4 style={{ margin:'8px 0' }}>Frames</h4>
                {frames.map(f => (
                    <button key={f.ms} onClick={() => jump(f.ms)} style={{ display:'block', width:'100%', border:'none', padding:0, margin:'0 0 8px 0', background:'transparent', cursor:'pointer' }}>
                        <img src={f.url} style={{ width:'100%', borderRadius:6 }} />
                        <div style={{ fontSize:11, opacity:.7 }}>{(f.ms/1000).toFixed(1)}s</div>
                    </button>
                ))}
                {!frames.length && <div style={{ fontSize:12, opacity:.7 }}><em>No frames extracted</em></div>}
            </div>

            <div>
                <video ref={videoRef} src={src} style={{ width:'100%', maxWidth:960, borderRadius:8 }} controls />
            </div>
        </div>
    )
}