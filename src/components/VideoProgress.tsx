import useVideoIngestQueue from "../hooks/useVideoIngestQueue.ts";

export default function VideoIngestProgress() {
    const { jobs, cancel, clearFinished, start } = useVideoIngestQueue()

    return (
        <section style={{ marginTop: 24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <h2 style={{ margin: 0 }}>Video Ingest</h2>
                <small style={{ opacity:.7 }}>track ingest progress, cancel jobs</small>
                <div style={{ marginLeft: 'auto', display:'flex', gap:8 }}>
                    <button onClick={clearFinished}>Clear finished</button>
                    <label style={{ border:'1px solid #ccc', padding:'6px 10px', borderRadius:6, cursor:'pointer' }}>
                        + Add video…
                        <input
                            type="file" accept="video/mp4,video/webm" style={{ display:'none' }}
                            onChange={e => {
                                const f = e.target.files?.[0]; if (!f) return
                                start(f, { strideSec: 2, maxFrames: 100, frameWidth: 512, posterAtSec: 0.2 })
                                e.target.value = ''
                            }}
                        />
                    </label>
                </div>
            </div>

            {!jobs.length && <div style={{ marginTop: 8, fontSize: 13, opacity: .7 }}><em>No active ingests</em></div>}

            <ul style={{ listStyle: 'none', padding: 0, marginTop: 12, display:'grid', gap:10 }}>
                {jobs.map(j => (
                    <li key={j.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap:'wrap' }}>
                            <strong>{j.fileName}</strong>
                            <span style={pill}>{j.status}</span>
                            {typeof j.framesDone === 'number' && typeof j.framesTotal === 'number' && (
                                <small style={{ opacity: .7 }}>frames {j.framesDone}/{j.framesTotal}</small>
                            )}
                            <small style={{ opacity: .7, marginLeft: 'auto' }}>
                                {Math.round(j.percent)}%
                            </small>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
                            <div style={{
                                width: `${Math.min(100, Math.max(0, j.percent))}%`,
                                height: '100%', background: '#0ea5e9'
                            }} />
                        </div>
                        <div style={{ display:'flex', gap:8, marginTop:8 }}>
                            <button onClick={() => cancel(j.id)} disabled={!(j.status === 'running' || j.status === 'queued')}>
                                Cancel
                            </button>
                            {j.error && <small style={{ color: '#b91c1c' }}>Error: {j.error}</small>}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    )
}

const pill: React.CSSProperties = {
    fontSize: 11,
    background: '#eef0f3',
    border: '1px solid #e0e4e8',
    borderRadius: 999,
    padding: '0px 8px',
}