import React, { useEffect, useState } from 'react'
import { listCollections, renameCollection, clearCollection, moveIdsToCollection } from '../lib/storage/store'

export default function CollectionManager() {
    const [rows, setRows] = useState<{name:string;count:number}[]>([])
    const [selected, setSelected] = useState<string>('')
    const [renameTo, setRenameTo] = useState('')
    const [moveTo, setMoveTo] = useState('')

    async function refresh(){ setRows(await listCollections()) }
    useEffect(()=>{ refresh() }, [])

    return (
        <section style={{ marginTop:24 }}>
            <h2>Collections</h2>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                <tr><th style={th}>Name</th><th style={th}>Count</th></tr>
                </thead>
                <tbody>
                {rows.map(r=>(
                    <tr key={r.name} style={{ borderTop:'1px solid #eee' }}>
                        <td style={td}><label><input type="radio" name="col" checked={selected===r.name} onChange={()=>setSelected(r.name)} /> {r.name}</label></td>
                        <td style={td}>{r.count}</td>
                    </tr>
                ))}
                {!rows.length && <tr><td style={td} colSpan={2}><em>No collections yet.</em></td></tr>}
                </tbody>
            </table>

            <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                <input placeholder="Rename to…" value={renameTo} onChange={e=>setRenameTo(e.target.value)} style={{ padding:8 }} />
                <button disabled={!selected || !renameTo.trim()} onClick={async()=>{ await renameCollection(selected, renameTo.trim()); setRenameTo(''); await refresh() }}>Rename</button>
                <button disabled={!selected} onClick={async()=>{ await clearCollection(selected); setSelected(''); await refresh() }}>Remove label</button>
            </div>

            <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                <input placeholder="Move ID list (comma‑sep)" value={moveTo} onChange={e=>setMoveTo(e.target.value)} style={{ padding:8, minWidth:320 }} />
                <button onClick={async()=>{
                    const [col, idsRaw] = moveTo.split('|') // "TargetName|id1,id2"
                    if (!col || !idsRaw) return
                    const ids = idsRaw.split(',').map(s=>s.trim()).filter(Boolean)
                    await moveIdsToCollection(ids, col.trim()); setMoveTo(''); await refresh()
                }}>Move IDs to collection</button>
            </div>
            <p style={{ fontSize:12, opacity:.7, marginTop:6 }}>Tip: move syntax <code>TargetName|id1,id2</code></p>
        </section>
    )
}
const th: React.CSSProperties = { textAlign:'left', padding:'6px 4px', borderBottom:'1px solid #eee' }
const td: React.CSSProperties = { padding:'6px 4px' }