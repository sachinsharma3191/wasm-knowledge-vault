import { useEffect, useMemo, useState } from 'react'
import {
    type HistoryEvent,
    listEvents,
    clearEvents,
    exportEvents,
    exportVault,
    downloadBlob,
    downloadJSON
} from '../lib/storage/store'

function time(ts: number) {
    const d = new Date(ts)
    return d.toLocaleString()
}

export default function HistoryPanel() {
    const [events, setEvents] = useState<HistoryEvent[]>([])
    const [filter, setFilter] = useState<'all' | HistoryEvent['kind']>('all')

    const load = async () => setEvents(await listEvents(500))
    useEffect(() => { load() }, [])

    const filtered = useMemo(() => filter === 'all' ? events : events.filter(e => e.kind === filter), [events, filter])

    const doClear = async () => { await clearEvents(); await load() }
    async function doExportVault() {
        const blob = await exportVault({ includeMedia: false })
        await downloadBlob(blob, `kv-vault-export-${new Date().toISOString().slice(0,10)}.json`)
    }

// Export only events (returns string -> wrap in Blob)
    async function doExportEvents() {
        const json = await exportEvents()          // <- this is a string
        await downloadJSON(json, `kv-events-${new Date().toISOString().slice(0,10)}.json`)
    }

    return (
        <section style={{ marginTop: 24 }}>
            <h2 style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>History</span>
                <span style={{ display:'flex', gap:8 }}>
          <select value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="all">All</option>
            <option value="upload">Uploads</option>
            <option value="paste">Pastes</option>
            <option value="search">Searches</option>
            <option value="qa">Q&A</option>
          </select>
          <button onClick={load}>Refresh</button>
          <button onClick={doExportVault}>Export vault</button>
                    <button onClick={doExportEvents}>Export events</button>
          <button onClick={doClear}>Clear</button>
        </span>
            </h2>

            <ul style={{ listStyle:'none', paddingLeft:0 }}>
                {filtered.map((e) => (
                    <li key={e.id} style={{ padding:'8px 10px', border:'1px solid #eee', borderRadius:6, marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                            <strong>{e.kind.toUpperCase()}</strong>
                            <small style={{ opacity:0.7 }}>{time(e.ts)}</small>
                        </div>

                        {e.kind === 'upload' && (
                            <div style={{ fontSize:13 }}>
                                File: <code>{e.fileName}</code> • Size: {prettyBytes(e.byteSize)} • Chunks: {e.chunks}
                            </div>
                        )}
                        {e.kind === 'paste' && (
                            <div style={{ fontSize:13 }}>
                                Paste • Size: {prettyBytes(e.byteSize)} • Chunks: {e.chunks}
                            </div>
                        )}
                        {e.kind === 'search' && (
                            <div style={{ fontSize:13 }}>
                                Query: <code>{e.query}</code> • Results: {e.results}
                                {e.topIds?.length ? <> • Top: <code>{e.topIds.slice(0,3).join(', ')}</code></> : null}
                            </div>
                        )}
                        {e.kind === 'qa' && (
                            <div style={{ fontSize:13 }}>
                                Q: <code>{e.question}</code>
                                {e.citations?.length ? <> • Citations: <code>{e.citations.slice(0,3).join(', ')}</code></> : null}
                            </div>
                        )}
                    </li>
                ))}
                {!filtered.length && <li style={{ opacity:0.7, padding:8 }}>No history yet.</li>}
            </ul>
        </section>
    )
}

function prettyBytes(n: number) {
    if (n < 1024) return `${n} B`
    const u = ['KB','MB','GB','TB']; let i = -1
    do { n = n / 1024; i++ } while (n >= 1024 && i < u.length - 1)
    return `${n.toFixed(1)} ${u[i]}`
}


