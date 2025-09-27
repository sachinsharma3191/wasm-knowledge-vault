/// <reference lib="webworker" />
import { kvReady, search as bm25Search } from '../lib/search/kv-index'
import { rerankHybrid } from '../lib/search/hybrid'
import { getMeta } from '../lib/storage/store'

type MsgIn = {
    type: 'search'
    query: string
    limit: number
    filterCollection: string
    filterTag: string
    tagBoost: number
    collectionBoost: number
    preferredCollection: string
    tagWeights: string
    excludeTags: string
}
type Hit = { doc_id: string; score: number }
type MsgOut = { type: 'result'; hits: Hit[] } | { type: 'error'; error: string }

let ready: Promise<void> | null = null
function ensureReady() {
    if (!ready) ready = kvReady()
    return ready
}

self.addEventListener('message', async (e: MessageEvent<MsgIn>) => {
    const m = e.data
    if (m.type !== 'search') return
    try {
        await ensureReady()
        const { query, limit, filterCollection, filterTag, tagBoost, collectionBoost, preferredCollection } = m

        let reranked = await rerankHybrid(bm25Search(query, Math.max(60, limit*4)), query, 0.65)

        // preload meta
        const metas = await Promise.all(reranked.map(h => getMeta(h.doc_id)))
        const qLower = query.toLowerCase()
        const prefCol = (preferredCollection || '').trim()

        // boosters
        for (let i = 0; i < reranked.length; i++) {
            const meta = metas[i]
            if (tagBoost > 0) {
                const tags = (meta?.tags ?? []).map((t:string)=>t.toLowerCase())
                if (tags.some(t => t && qLower.includes(t))) reranked[i].score += tagBoost
            }
            if (collectionBoost > 0 && prefCol && meta?.collection === prefCol) {
                reranked[i].score += collectionBoost
            }
        }
        reranked = reranked.sort((a,b)=>b.score - a.score)

        // strict filters
        let items = reranked
        if (filterCollection.trim()) items = items.filter((_,i) => (metas[i]?.collection ?? '') === filterCollection.trim())
        if (filterTag.trim()) {
            const t = filterTag.trim().toLowerCase()
            items = items.filter((_,i) => (metas[i]?.tags ?? []).map((x:string)=>x.toLowerCase()).includes(t))
        }

        ;(self as any).postMessage({ type:'result', hits: items.slice(0, limit) } as MsgOut)
    } catch (err: any) {
        ;(self as any).postMessage({ type:'error', error: String(err) } as MsgOut)
    }
})