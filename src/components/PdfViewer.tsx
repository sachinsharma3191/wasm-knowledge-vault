import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import { listMediaByPrefix, getMediaURL } from '../lib/storage/store'
import { thumbKeyForPage } from '../lib/media/id'
import { getMediaBlob } from '../lib/storage/store'
import { pdfKeyForBase } from '../lib/media/id'
import { getDocument } from 'pdfjs-dist'
import 'pdfjs-dist/build/pdf.worker.mjs'

function ThumbStrip({ baseId, current, onJump }: { baseId: string; current: number; onJump: (p:number)=>void }) {
    const [urls, setUrls] = React.useState<{page: number; url: string}[]>([])
    React.useEffect(() => {
        let alive = true
        ;(async () => {
            const ids = await listMediaByPrefix(`thumb:${baseId}:p`)
            ids.sort((a,b) => {
                const pa = parseInt(a.split(':p')[1] || '1', 10)
                const pb = parseInt(b.split(':p')[1] || '1', 10)
                return pa - pb
            })
            const out: {page:number; url:string}[] = []
            for (const id of ids) {
                const page = parseInt(id.split(':p')[1] || '1', 10)
                const url = (await getMediaURL(thumbKeyForPage(baseId, page))) || ''
                if (url) out.push({ page, url })
            }
            if (alive) setUrls(out)
        })()
        return () => { alive = false; urls.forEach(u => URL.revokeObjectURL(u.url)) }
    }, [baseId])

    return (
        <div style={{ overflowY:'auto', maxHeight:'calc(100vh - 32px)', borderRight:'1px solid #eee', paddingRight:8 }}>
            {urls.map(({ page, url }) => (
                <button key={page} onClick={() => onJump(page)} style={{
                    display:'block', width:'100%', textAlign:'left', border:'none', background:'transparent',
                    marginBottom:8, padding:0, cursor:'pointer', outline: current===page ? '2px solid #0ea5e9' : 'none', borderRadius:6
                }}>
                    <img src={url} alt={`p${page}`} style={{ width:'100%', borderRadius:6, display:'block' }} />
                    <div style={{ fontSize:11, opacity:.7, marginTop:2 }}>p{page}</div>
                </button>
            ))}
            {!urls.length && <div style={{ fontSize:12, opacity:.7 }}><em>No thumbnails</em></div>}
        </div>
    )
}


export default function PdfViewer() {
    const { baseId = '' } = useParams()
    const [sp] = useSearchParams()
    const pageParam = Math.max(1, parseInt(sp.get('page') || '1', 10))

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [page, setPage] = useState(pageParam)
    const [numPages, setNumPages] = useState(0)

    useEffect(() => { setPage(pageParam) }, [pageParam])

    useEffect(() => {
        let canceled = false
        ;(async () => {
            const blob = await getMediaBlob(pdfKeyForBase(baseId))
            if (!blob) return
            const buf = await blob.arrayBuffer()
            const pdf = await getDocument({ data: buf }).promise
            setNumPages(pdf.numPages)
            const p = Math.min(Math.max(1, page), pdf.numPages)
            const pg = await pdf.getPage(p)
            const viewport = pg.getViewport({ scale: 1.5 })
            const canvas = canvasRef.current!
            const ctx = canvas.getContext('2d')!
            canvas.width = Math.ceil(viewport.width)
            canvas.height = Math.ceil(viewport.height)
            await pg.render({ canvasContext: ctx as any, viewport }).promise
            if (!canceled) {
                // done
            }
            await pdf.destroy()
        })()
        return () => { canceled = true }
    }, [baseId, page])

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: 16 }}>
            {/* Sidebar with page thumbs */}
            <ThumbStrip baseId={baseId} current={page} onJump={setPage} />

            {/* Main viewer */}
            <div>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                    <Link to="/">← Back</Link>
                    <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
                        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}>Prev</button>
                        <span>Page {page} / {numPages || '?'}</span>
                        <button onClick={() => setPage(p => p+1)} disabled={numPages && page>=numPages}>Next</button>
                    </div>
                </div>
                <canvas ref={canvasRef} style={{ width:'100%', maxWidth:900, background:'#fff', border:'1px solid #eee', borderRadius:6 }} />
            </div>
        </div>
    )
}