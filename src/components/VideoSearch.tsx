import { useState } from 'react'
import useVideoSearch from '../hooks/useVideoSearch'
import { Link } from 'react-router-dom'

export default function VideoSearch() {
    const [q, setQ] = useState('')
    const { busy, hits, search } = useVideoSearch()

    return (
        <section style={{ marginTop: 24 }}>
            <h2>Video Search (CLIP)</h2>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search video frames (e.g., 'whiteboard diagram', 'error log console')" style={{ padding:8, minWidth:320 }} />
                <button onClick={() => search(q)} disabled={!q.trim() || busy}>{busy ? 'Searching…' : 'Search frames'}</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12, marginTop:12 }}>
                {hits.map(h => (
                    <div key={h.id} style={{ border:'1px solid #eee', borderRadius:8, padding:8 }}>
                        <div style={{ position:'relative' }}>
                            <img src={h.url} alt="" style={{ width:'100%', display:'block', borderRadius:6 }} />
                            <span style={{ position:'absolute', top:6, left:6, fontSize:11, background:'#eef0f3', border:'1px solid #e0e4e8', borderRadius:999, padding:'0 6px' }}>
                {(h.ms/1000).toFixed(1)}s
              </span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
                            <small style={{ opacity:0.7 }}>score {h.score.toFixed(3)}</small>
                            <Link to={`/video/${h.baseId}?t=${(h.ms/1000).toFixed(2)}`}>Open</Link>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}