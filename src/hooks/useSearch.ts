import { useCallback, useState } from 'react'
import { search as bm25Search, getDoc as wasmGetDoc } from '../lib/search/kv-index'
import { rerankHybrid } from '../lib/search/hybrid'
import { getDoc as storeGetDoc, getMeta, addEvent, type SavedSearch } from '../lib/storage/store'
import { Helpers as H } from '../lib/helpers'

type Hit = { doc_id: string; score: number }

export default function useSearch({
                                      setBusy,
                                       tagBoost,
                                      collectionBoost,
                                      preferredCollection,
    tagWeights, excludeTags
                                  }: {
    setBusy: (b: boolean) => void
    tagBoost: number
    collectionBoost: number
    preferredCollection: string
    tagWeights: string;
    excludeTags: string;
}) {
    const [query, setQuery] = useState('')
    const [filterCollection, setFilterCollection] = useState('')
    const [filterTag, setFilterTag] = useState('')
    const [hits, setHits] = useState<Hit[]>([])

    const fetchText = useCallback(async (id: string) => {
        return (await storeGetDoc(id)) ?? wasmGetDoc(id) ?? ''
    }, [])

    const _run = useCallback(async (q: string, col: string, tag: string) => {
        const bm25 = bm25Search(q, 60)
        let reranked = await rerankHybrid(bm25, q, 0.65)

        // Preload metas to avoid repeated IDB calls
        const metas = await Promise.all(reranked.map(h => getMeta(h.doc_id)))
        const qLower = q.toLowerCase()
        const prefCol = (preferredCollection || '').trim()

        for (let i = 0; i < reranked.length; i++) {
            const m = metas[i]
            // Tag boost (if any tag appears in query)
            if (tagBoost > 0) {
                const tags: string[] = (m?.tags ?? []).map(t => t.toLowerCase())
                if (tags.some(t => t && qLower.includes(t))) {
                    reranked[i] = { ...reranked[i], score: reranked[i].score + tagBoost }
                }
            }
            // Collection boost (if matches preferred collection)
            if (collectionBoost > 0 && prefCol) {
                if ((m?.collection ?? '') === prefCol) {
                    reranked[i] = { ...reranked[i], score: reranked[i].score + collectionBoost }
                }
            }
        }
        reranked = [...reranked].sort((a, b) => b.score - a.score)

        // Collection filter (strict)
        let items = reranked
        if (col.trim()) {
            const filtered: typeof reranked = []
            for (let i = 0; i < reranked.length; i++) {
                const m = metas[i]
                if (m?.collection === col.trim()) filtered.push(reranked[i])
            }
            items = filtered
        }

        // Tag filter (strict)
        if (tag.trim()) {
            const t = tag.trim().toLowerCase()
            const filtered: typeof items = []
            for (let i = 0; i < items.length; i++) {
                const idx = reranked.findIndex(r => r.doc_id === items[i].doc_id)
                const m = (idx >= 0 ? metas[idx] : await getMeta(items[i].doc_id))
                const tags: string[] = (m?.tags ?? []).map(u => u.toLowerCase())
                if (tags.includes(t)) filtered.push(items[i])
            }
            items = filtered
        }

        setHits(items.slice(0, 12))
        await addEvent({
            id: H.nowId('ev'),
            kind: 'search',
            ts: Date.now(),
            query: q,
            results: items.length,
            topIds: items.slice(0, 5).map(h => h.doc_id),
            collection: col,
            tag,
        } as any)
    }, [tagBoost, collectionBoost, preferredCollection])

    const handleSearch = useCallback(async () => {
        setBusy(true)
        try { await _run(query, filterCollection, filterTag) }
        finally { setBusy(false) }
    }, [query, filterCollection, filterTag, _run, setBusy])

    const runSavedSearch = useCallback(async (s: SavedSearch) => {
        setQuery(s.query)
        setFilterCollection(s.collection ?? '')
        setFilterTag(s.tag ?? '')
        setBusy(true)
        try { await _run(s.query, s.collection ?? '', s.tag ?? '') }
        finally { setBusy(false) }
    }, [_run, setBusy])

    return {
        query, setQuery,
        filterCollection, setFilterCollection,
        filterTag, setFilterTag,
        hits, handleSearch, fetchText,
        runSavedSearch,
    }
}