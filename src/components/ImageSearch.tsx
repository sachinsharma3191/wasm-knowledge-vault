import React, { useState } from 'react'
import useImageSearch from '../hooks/useImageSearch'
import { Link } from 'react-router-dom'

export default function ImageSearch() {
    const [q, setQ] = useState('')
    const { busy, hits, search } = useImageSearch()

    return (
        <section style={{ marginTop: 24 }}>
            <h2>Image Search (CLIP)</h2>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search images (e.g., 'diagram', 'table', 'chart'…)" style={{ padding:8, minWidth:320 }} />
                <button onClick={() => search(q)} disabled={!q.trim() || busy}>{busy ? 'Searching…' : 'Search images'}</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12, marginTop:12 }}>
                {hits.map(h => (
                    <div key={h.id} style={{ border:'1px solid #eee', borderRadius:8, padding:8 }}>
                        <div style={{ position:'relative' }}>
                            <img src={h.url} alt="" style={{ width:'100%', display:'block', borderRadius:6 }} />
                            {typeof h.page === 'number' && (
                                <span style={{ position:'absolute', top:6, left:6, fontSize:11, background:'#eef0f3', border:'1px solid #e0e4e8', borderRadius:999, padding:'0 6px' }}>
                  p{h.page}
                </span>
                            )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
                            <small style={{ opacity:0.7 }}>score {h.score.toFixed(3)}</small>
                            <Link to={`/viewer/${h.baseId}?page=${h.page ?? 1}`}>Open</Link>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}