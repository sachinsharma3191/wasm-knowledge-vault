import React, { useEffect, useState } from 'react'
import TagEditor from './TagEditor'
import {baseIdFromChunk, pageFromChunk} from '../lib/media/id'
import { highlight } from '../lib/ui/highlight'
import Thumbnail from './Thumbnail'
import { Link } from 'react-router-dom'

type Props = {
    id: string
    score: number
    query: string
    fetcher: (id: string) => Promise<string>
}

export default function ResultItem({ id, score, query, fetcher }: Props) {
    const [preview, setPreview] = useState('…loading')
    const [full, setFull] = useState<string | null>(null)
    const [open, setOpen] = useState(false)
    const base = baseIdFromChunk(id)
    const page = pageFromChunk(id)

    useEffect(() => {
        let ok = true
        fetcher(id).then(t => {
            if (!ok) return
            setPreview(t.slice(0, 280))
            setFull(t)
        })
        return () => { ok = false }
    }, [id, fetcher])

    return (
        <li style={{ marginTop: 12 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <strong>{id}</strong>
                <small style={{ opacity:0.7 }}>score {score.toFixed(3)}</small>
                <span style={pill}>Page {pageFromChunk(id)}</span>
                <button style={{ marginLeft:'auto' }} onClick={() => setOpen(v => !v)}>{open ? 'Collapse' : 'Expand'}</button>
                <Link to={`/viewer/${base}?page=${page}`} style={{ marginLeft: 8, fontSize: 12 }}>Open</Link>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'start', marginTop:6 }}>
                <Thumbnail chunkId={id} />
                <div style={{ whiteSpace:'pre-wrap', background:'#f6f6f6', padding:8, borderRadius:6 }}>
                    {!open
                        ? <p style={{ margin:0 }}>{highlight(preview, query)}{(full?.length ?? 0) > 280 ? '…' : ''}</p>
                        : <p style={{ margin:0 }}>{highlight(full ?? '', query)}</p>}
                </div>
            </div>

            <TagEditor id={id} />
        </li>
    )
}

const pill: React.CSSProperties = {
    fontSize: 11,
    background: '#eef0f3',
    border: '1px solid #e0e4e8',
    borderRadius: 999,
    padding: '0px 8px',
}