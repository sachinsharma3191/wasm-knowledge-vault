import React, { useEffect, useState } from 'react'
import type { SavedSearch } from '../lib/storage/store'
import { listSavedSearches, saveSearch, deleteSavedSearch } from '../lib/storage/store'
import { Helpers as H } from '../lib/helpers'

export default function SavedSearches({
                                          current,
                                          onRun,
                                      }: {
    current: { query: string; collection?: string; tag?: string }
    onRun: (s: SavedSearch) => void
}) {
    const [items, setItems] = useState<SavedSearch[]>([])
    const [name, setName] = useState('')

    const load = async () => setItems(await listSavedSearches())
    useEffect(() => { load() }, [])

    const doSave = async () => {
        if (!name.trim()) return
        const s: SavedSearch = {
            id: H.nowId('ss'),
            name: name.trim(),
            query: current.query,
            collection: current.collection?.trim() || undefined,
            tag: current.tag?.trim() || undefined,
            createdAt: Date.now(),
        }
        await saveSearch(s)
        setName('')
        await load()
    }

    const doDelete = async (id: string) => {
        await deleteSavedSearch(id)
        await load()
    }

    return (
        <section style={{ marginTop: 24 }}>
            <h2>Saved Searches</h2>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Name this search…" style={{ padding:8, minWidth:220 }} />
                <button onClick={doSave} disabled={!current.query.trim()}>Save current</button>
            </div>

            <ul style={{ listStyle:'none', paddingLeft:0, marginTop:12 }}>
                {items.map(s => (
                    <li key={s.id} style={{ border:'1px solid #eee', borderRadius:6, padding:'8px 10px', marginBottom:8, display:'flex', gap:8, alignItems:'center' }}>
                        <strong style={{ minWidth:180 }}>{s.name}</strong>
                        <code style={{ fontSize:12, opacity:0.85 }}>{s.query}</code>
                        {s.collection && <span style={pill}>Collection: {s.collection}</span>}
                        {s.tag && <span style={pill}>Tag: {s.tag}</span>}
                        <span style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button onClick={() => onRun(s)}>Run</button>
              <button onClick={() => doDelete(s.id)}>Delete</button>
            </span>
                    </li>
                ))}
                {!items.length && <li style={{ opacity:0.7 }}>No saved searches yet.</li>}
            </ul>
        </section>
    )
}

const pill: React.CSSProperties = {
    fontSize: 12,
    background: '#f1f1f1',
    borderRadius: 999,
    padding: '2px 8px',
}