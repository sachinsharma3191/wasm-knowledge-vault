import { useCallback, useState } from 'react'
import { listImageEmbeddingIds, getImageEmbedding, getMediaURL } from '../lib/storage/store'
import { embedTextOnce } from '../lib/search/clip-queue'
import {parseVideoKey} from "../lib/media/video-id.ts";

export type VideoHit = { id: string; score: number; url: string; baseId: string; ms: number }

function cosine(a: Float32Array, b: Float32Array) {
    let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]
    return s
}

export default function useVideoSearch() {
    const [busy, setBusy] = useState(false)
    const [hits, setHits] = useState<VideoHit[]>([])

    const search = useCallback(async (query: string, limit = 24) => {
        setBusy(true)
        try {
            const qvec = await embedTextOnce('vq:'+query, query)
            const ids = (await listImageEmbeddingIds()).filter(id => id.startsWith('vframe:'))
            const scored: VideoHit[] = []
            for (const id of ids) {
                const ivec = await getImageEmbedding(id)
                if (!ivec) continue
                const score = cosine(qvec, ivec) // normalized in worker
                const url = (await getMediaURL(id)) || ''
                const { baseId, ms = 0 } = parseVideoKey(id)
                scored.push({ id, score, url, baseId, ms })
            }
            scored.sort((a, b) => b.score - a.score)
            setHits(scored.slice(0, limit))
        } finally {
            setBusy(false)
        }
    }, [])

    return { busy, hits, search }
}