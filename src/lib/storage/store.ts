import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

interface KVSchema extends DBSchema {
    docs:   { key: string; value: { id: string; text: string; createdAt: number } }
    embeds: { key: string; value: { id: string; vec: Float32Array } }
    meta:   { key: string; value: { id: string; tags: string[]; collection?: string; baseId?: string; page?: number } }
    events: { key: string; value: HistoryEvent }
    prefs:  { key: string; value: any }
    saved_searches: { key: string; value: { id: string; name: string; query: string; collection?: string; tag?: string; createdAt: number } }
    media:  { key: string; value: { id: string; mime: string; blob: Blob; createdAt: number } }
    /** NEW: image embeddings (CLIP) */
    iembeds: { key: string; value: { id: string; vec: Float32Array } }
}

export type HistoryEvent =
    | { id: string; kind: 'upload'; ts: number; fileName: string; byteSize: number; chunks: number }
    | { id: string; kind: 'paste';  ts: number; byteSize: number; chunks: number }
    | { id: string; kind: 'search'; ts: number; query: string; results: number; topIds: string[]; collection?: string; tag?: string }
    | { id: string; kind: 'qa';     ts: number; question: string; citations: string[] }

let dbPromise: Promise<IDBPDatabase<KVSchema>> | null = null
function db() {
    if (!dbPromise) {
        dbPromise = openDB<KVSchema>('kv-vault', 6, {
            upgrade(d, oldVersion) {
                if (oldVersion < 1) {
                    d.createObjectStore('docs',   { keyPath: 'id' })
                    d.createObjectStore('embeds', { keyPath: 'id' })
                }
                if (oldVersion < 2) {
                    d.createObjectStore('meta',   { keyPath: 'id' })
                    d.createObjectStore('events', { keyPath: 'id' })
                }
                if (oldVersion < 3) {
                    d.createObjectStore('prefs')
                    d.createObjectStore('saved_searches', { keyPath: 'id' })
                }
                if (oldVersion < 4) {
                    d.createObjectStore('media', { keyPath: 'id' })
                }
                if (oldVersion < 6) {
                    d.createObjectStore('iembeds', { keyPath: 'id' })
                }
            },
        })
    }
    return dbPromise
}

/* ---------- docs / embeds / meta ---------- */
export async function putDoc(id: string, text: string) { await (await db()).put('docs', { id, text, createdAt: Date.now() }) }
export async function getDoc(id: string) { const v = await (await db()).get('docs', id); return v?.text ?? null }
export async function listDocIds(): Promise<string[]> { const d = await db(); const ids: string[] = []; let c = await d.transaction('docs').store.openCursor(); while (c) { ids.push(c.key as string); c = await c.continue() } return ids }
export async function clearAll() { const d = await db(); await Promise.all([d.clear('docs'), d.clear('embeds'), d.clear('meta')]) }

export async function putEmbedding(id: string, vec: Float32Array) { await (await db()).put('embeds', { id, vec: new Float32Array(vec) }) }
export async function getEmbedding(id: string) { const v = await (await db()).get('embeds', id); return v ? new Float32Array(v.vec) : null }

export async function setMeta(id: string, tags: string[], collection?: string, baseId?: string, page?: number) {
    await (await db()).put('meta', { id, tags, collection, baseId, page })
}
export async function getMeta(id: string) { return (await (await db()).get('meta', id)) ?? { id, tags: [] as string[] } }

/* ---------- events ---------- */
export async function addEvent(ev: HistoryEvent) { await (await db()).put('events', ev) }
export async function listEvents(limit = 200) { const d = await db(); const all: HistoryEvent[] = []; let c = await d.transaction('events').store.openCursor(); while (c) { all.push(c.value); c = await c.continue() } all.sort((a,b)=>b.ts-a.ts); return all.slice(0, limit) }
export async function clearEvents() { await (await db()).clear('events') }
export async function exportEvents(): Promise<string> { const events = await listEvents(10000); return JSON.stringify({ version: 1, events }, null, 2) }

/* ---------- prefs / saved searches ---------- */
export async function setPref<T = any>(key: string, value: T) { await (await db()).put('prefs', value, key) }
export async function getPref<T = any>(key: string, fallback: T): Promise<T> { const v = await (await db()).get('prefs', key); return (v ?? fallback) as T }

export type SavedSearch = { id: string; name: string; query: string; collection?: string; tag?: string; createdAt: number }
export async function saveSearch(s: SavedSearch) { await (await db()).put('saved_searches', s) }
export async function listSavedSearches(): Promise<SavedSearch[]> { const d = await db(); const out: SavedSearch[] = []; let c = await d.transaction('saved_searches').store.openCursor(); while (c) { out.push(c.value); c = await c.continue() } out.sort((a,b)=>b.createdAt-a.createdAt); return out }
export async function deleteSavedSearch(id: string) { await (await db()).delete('saved_searches', id) }

/* ---------- media ---------- */
export async function putMediaBlob(id: string, blob: Blob, mime = blob.type || 'application/octet-stream') {
    await (await db()).put('media', { id, mime, blob, createdAt: Date.now() })
}
export async function getMediaURL(id: string): Promise<string | null> {
    const v = await (await db()).get('media', id)
    if (!v) return null
    return URL.createObjectURL(v.blob)
}
export async function getMediaBlob(id: string): Promise<Blob | null> {
    const v = await (await db()).get('media', id)
    return v?.blob ?? null
}
export async function deleteMedia(id: string) { await (await db()).delete('media', id) }
export async function clearMedia() { await (await db()).clear('media') }
export async function listMediaByPrefix(prefix: string): Promise<string[]> {
    const d = await db(); const ids: string[] = []
    let c = await d.transaction('media').store.openCursor()
    while (c) { const k = c.key as string; if (k.startsWith(prefix)) ids.push(k); c = await c.continue() }
    return ids
}

/* ---------- image embeddings (CLIP) ---------- */
export async function putImageEmbedding(id: string, vec: Float32Array) { await (await db()).put('iembeds', { id, vec: new Float32Array(vec) }) }
export async function getImageEmbedding(id: string) { const v = await (await db()).get('iembeds', id); return v ? new Float32Array(v.vec) : null }
export async function listImageEmbeddingIds(prefix?: string) {
    const d = await db(); const ids: string[] = []
    let c = await d.transaction('iembeds').store.openCursor()
    while (c) { const k = c.key as string; if (!prefix || k.startsWith(prefix)) ids.push(k); c = await c.continue() }
    return ids
}


/* -------- Vector search over embeddings -------- */
export async function searchEmbeddings(
    queryVec: Float32Array,
    k = 10
): Promise<{ id: string; score: number }[]> {
    const d = await db()
    const results: { id: string; score: number }[] = []

    let cursor = await d.transaction('embeds').store.openCursor()
    while (cursor) {
        const { id, vec } = cursor.value
        const score = cosineSimilarity(queryVec, vec as Float32Array)
        results.push({ id, score })
        cursor = await cursor.continue()
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, k)
}

/* --- helper --- */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0,
        na = 0,
        nb = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
        na += a[i] * a[i]
        nb += b[i] * b[i]
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8)
}


/* -------- Collections manager helpers -------- */
export async function listCollections(): Promise<{ name: string; count: number }[]> {
    const d = await db(); const map = new Map<string, number>()
    let c = await d.transaction('meta').store.openCursor()
    while (c) {
        const m = c.value as any
        if (m.collection) map.set(m.collection, (map.get(m.collection) || 0) + 1)
        c = await c.continue()
    }
    return Array.from(map.entries()).map(([name,count]) => ({ name, count })).sort((a,b)=>a.name.localeCompare(b.name))
}
export async function renameCollection(oldName: string, newName: string) {
    const d = await db(); const tx = d.transaction('meta','readwrite'); let c = await tx.store.openCursor()
    while (c) {
        const m = c.value as any
        if (m.collection === oldName) { m.collection = newName; await c.update(m) }
        c = await c.continue()
    }
    await tx.done
}
export async function clearCollection(name: string) {
    const d = await db(); const tx = d.transaction('meta','readwrite'); let c = await tx.store.openCursor()
    while (c) {
        const m = c.value as any
        if (m.collection === name) { delete m.collection; await c.update(m) }
        c = await c.continue()
    }
    await tx.done
}
export async function moveIdsToCollection(ids: string[], newName: string) {
    const d = await db(); const tx = d.transaction('meta','readwrite')
    for (const id of ids) {
        const m = (await tx.store.get(id)) as any || { id, tags: [] }
        m.collection = newName
        await tx.store.put(m)
    }
    await tx.done
}


/* ========== VAULT EXPORT / IMPORT ========== */

type KVExport = {
    version: number
    docs: any[]
    embeds: { id: string; vec: number[] }[]
    meta: any[]
    events: any[]
    prefs: { key: string; value: any }[]
    saved_searches: any[]
    media: { id: string; mime: string; dataURL: string }[]
    iembeds: { id: string; vec: number[] }[]
}


/** Convert a Blob to a data URL (safe for large blobs) */
async function blobToDataURL(blob: Blob): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result as string)
        fr.onerror = () => reject(fr.error || new Error('readAsDataURL failed'))
        fr.readAsDataURL(blob)
    })
}

/** Full vault export with collect‑then‑process pattern to keep IDB tx active */
export async function exportVault(options: { includeMedia?: boolean } = {}): Promise<Blob> {
    const { includeMedia = true } = options
    const d = await db()

    // ----- docs (simple)
    const docs = await d.getAll('docs')

    // ----- embeds (Float32Array -> number[])
    const embedsRaw = await d.getAll('embeds')
    const embeds = embedsRaw.map((e: any) => ({ id: e.id, vec: Array.from(e.vec as Float32Array) }))

    // ----- meta
    const meta = await d.getAll('meta')

    // ----- events
    const events = await d.getAll('events')

    // ----- prefs (need keys + values)
    const prefs: { key: string; value: any }[] = []
    {
        const tx = d.transaction('prefs')
        let cur = await tx.store.openCursor()
        while (cur) { prefs.push({ key: cur.key as string, value: cur.value }); cur = await cur.continue() }
        await tx.done
    }

    // ----- saved searches
    const saved_searches = await d.getAll('saved_searches')

    // ----- media (collect first; convert after)
    const media: { id: string; mime: string; dataURL: string }[] = []
    if (includeMedia && d.objectStoreNames.contains('media')) {
        // 1) Collect quickly inside a readonly tx
        const raw: { id: string; mime: string; blob: Blob }[] = []
        {
            const tx = d.transaction('media')
            let cur = await tx.store.openCursor()
            while (cur) {
                const v = cur.value as any
                raw.push({ id: v.id ?? (cur.key as string), mime: v.mime, blob: v.blob })
                cur = await cur.continue()
            }
            await tx.done
        }
        // 2) Convert blobs to dataURL outside tx
        for (const r of raw) {
            media.push({ id: r.id, mime: r.mime, dataURL: await blobToDataURL(r.blob) })
        }
    }

    // ----- image embeddings (optional store)
    const iembeds: { id: string; vec: number[] }[] = []
    if (d.objectStoreNames.contains('iembeds')) {
        const raws = await d.getAll('iembeds')
        for (const v of raws as any[]) iembeds.push({ id: v.id, vec: Array.from(v.vec as Float32Array) })
    }

    const payload = {
        version: 1,
        docs,
        embeds,
        meta,
        events,
        prefs,
        saved_searches,
        media,
        iembeds,
    }

    return new Blob([JSON.stringify(payload)], { type: 'application/json' })
}

export async function importVault(fileOrBlob: File | Blob) {
    const text = await fileOrBlob.text()
    const data: KVExport = JSON.parse(text)
    const d = await db()

    const tx = d.transaction(['docs','embeds','meta','events','prefs','saved_searches','media','iembeds'], 'readwrite')

    // put docs
    for (const v of data.docs || []) await tx.objectStore('docs').put(v)
    // embeds
    for (const v of data.embeds || []) await tx.objectStore('embeds').put({ id: v.id, vec: new Float32Array(v.vec) })
    // meta
    for (const v of data.meta || []) await tx.objectStore('meta').put(v)
    // events
    for (const v of data.events || []) await tx.objectStore('events').put(v)
    // prefs
    for (const kv of data.prefs || []) await tx.objectStore('prefs').put(kv.value, kv.key)
    // saved searches
    for (const v of data.saved_searches || []) await tx.objectStore('saved_searches').put(v)
    // media
    for (const m of data.media || []) {
        const blob = dataURLToBlob(m.dataURL)
        await tx.objectStore('media').put({ id: m.id, mime: m.mime, blob, createdAt: Date.now() })
    }
    // image embeds
    if (tx.db.objectStoreNames.contains('iembeds')) {
        for (const v of data.iembeds || []) await tx.objectStore('iembeds').put({ id: v.id, vec: new Float32Array(v.vec) })
    }

    await (tx as any).done
}



export async function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}

export async function downloadJSON(json: string | object, filename: string) {
    const text = typeof json === 'string' ? json : JSON.stringify(json, null, 2)
    const blob = new Blob([text], { type: 'application/json' })
    return downloadBlob(blob, filename)
}