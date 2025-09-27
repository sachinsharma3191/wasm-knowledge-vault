import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoc as storeGetDoc } from '../lib/storage/store'
import Thumbnail from './Thumbnail'
import { highlight } from '../lib/ui/highlight'
import { baseIdFromChunk, pageFromChunk } from '../lib/media/id'

type Source = {
    id: string
    text: string
    baseId: string
    page: number
}

export default function QACitations({ ids, query }: { ids: string[]; query: string }) {
    const [sources, setSources] = useState<Source[]>([])

    useEffect(() => {
        let alive = true
        ;(async () => {
            const out: Source[] = []
            for (const id of ids) {
                const text = (await storeGetDoc(id)) ?? ''
                const baseId = baseIdFromChunk(id)
                const page = pageFromChunk(id)
                out.push({ id, text, baseId, page })
            }
            if (alive) setSources(out)
        })()
        return () => { alive = false }
    }, [ids])

    if (!ids?.length) return null

    return (
        <section style={{ marginTop: 12 }}>
            <h3 style={{ margin: '8px 0' }}>Sources</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, display: 'grid', gap: 8 }}>
                {sources.map((s) => (
                    <li key={s.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'start', border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                        {/* Thumbnail */}
                        <Thumbnail chunkId={s.id} size={72} />

                        {/* Snippet */}
                        <div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: 13 }}>{s.id}</strong>
                                <span style={pill}>Page {s.page}</span>
                            </div>
                            <div style={{ background: '#f8f9fa', border: '1px solid #eee', borderRadius: 6, padding: 8, whiteSpace: 'pre-wrap' }}>
                                {snippetHighlighted(s.text, query)}
                            </div>
                        </div>

                        {/* Anchor */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <Link to={`/viewer/${s.baseId}?page=${s.page}`} style={{ textDecoration: 'none' }}>
                                <button>Open</button>
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    )
}

/* --- helpers --- */

function snippetHighlighted(text: string, query: string, radius = 180) {
    if (!text) return <em style={{ opacity: 0.7 }}>No preview</em>
    const t = text
    const terms = Array.from(new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)))
    let idx = -1
    for (const term of terms) {
        const i = t.toLowerCase().indexOf(term)
        if (i !== -1) { idx = idx === -1 ? i : Math.min(idx, i) }
    }
    if (idx === -1) {
        const preview = t.slice(0, radius * 2)
        return <span>{highlight(preview, query)}{t.length > preview.length ? '…' : ''}</span>
    }
    const start = Math.max(0, idx - radius)
    const end = Math.min(t.length, idx + radius)
    const prefix = start > 0 ? '…' : ''
    const suffix = end < t.length ? '…' : ''
    const window = t.slice(start, end)
    return <span>{prefix}{highlight(window, query)}{suffix}</span>
}

const pill: React.CSSProperties = {
    fontSize: 11,
    background: '#eef0f3',
    border: '1px solid #e0e4e8',
    borderRadius: 999,
    padding: '0px 8px',
}