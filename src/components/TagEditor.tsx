import React, { useEffect, useState } from 'react'
import { getMeta, setMeta } from '../lib/storage/store'

export default function TagEditor({ id }: { id: string }) {
    const [tags, setTags] = useState<string[]>([])
    const [collection, setCollection] = useState<string>('')

    useEffect(() => {
        getMeta(id).then(m => {
            setTags(m.tags ?? [])
            setCollection(m.collection ?? '')
        })
    }, [id])

    const save = async () => {
        await setMeta(id, tags.filter(Boolean), collection || undefined)
    }

    return (
        <div style={{ fontSize:12, marginTop:6 }}>
            <label>Tags: </label>
            <input
                value={tags.join(', ')}
                onChange={e => setTags(e.target.value.split(',').map(s => s.trim()))}
                style={{ width: 260 }}
            />
            <label style={{marginLeft:8}}>Collection: </label>
            <input value={collection} onChange={e => setCollection(e.target.value)} style={{ width:140 }}/>
            <button onClick={save} style={{ marginLeft:8 }}>Save</button>
        </div>
    )
}