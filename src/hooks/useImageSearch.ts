import { useCallback, useState } from 'react'
import { embedTextOnce } from '../lib/search/clip-queue'
import { getImageEmbedding, listImageEmbeddingIds, getMediaURL } from '../lib/storage/store'
import { parseMediaId } from '../lib/media/id'

export type ImageHit = { id: string; score: number; url: string; baseId: string; page?: number }

function cosine(a: Float32Array, b: Float32Array) {
    let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]
    return s
}

export default function useImageSearch() {
    const [busy, setBusy] = useState(false)
    const [hits, setHits] = useState<ImageHit[]>([])

    const search = useCallback(async (query: string, limit = 24) => {
        setBusy(true)
        try {
            const qvec = await embedTextOnce('q:'+query, query)
            const ids = await listImageEmbeddingIds('img:')
            const scored: ImageHit[] = []
            for (const id of ids) {
                const ivec = await getImageEmbedding(id)
                if (!ivec) continue
                const score = cosine(qvec, ivec) // normalized in worker
                const url = (await getMediaURL(id)) || ''
                const meta = parseMediaId(id)
                scored.push({ id, score, url, baseId: meta.baseId, page: meta.page })
            }
            scored.sort((a, b) => b.score - a.score)
            setHits(scored.slice(0, limit))
        } finally {
            setBusy(false)
        }
    }, [])

    return { busy, hits, search }
}