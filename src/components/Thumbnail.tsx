import { useEffect, useState } from 'react'
import { getMediaURL } from '../lib/storage/store'
import { baseIdFromChunk, pageFromChunk, thumbKeyForBase, thumbKeyForPage } from '../lib/media/id'

export default function Thumbnail({ chunkId, size = 80 }: { chunkId: string; size?: number }) {
    const [url, setUrl] = useState<string | null>(null)

    useEffect(() => {
        let alive = true
        ;(async () => {
            const base = baseIdFromChunk(chunkId)
            const page = pageFromChunk(chunkId)
            let u = await getMediaURL(thumbKeyForPage(base, page))
            if (!u) {
                // fallback: first page thumb if specific page not present
                u = await getMediaURL(thumbKeyForBase(base))
            }
            if (alive) setUrl(u)
        })()
        return () => { alive = false; if (url) URL.revokeObjectURL(url) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chunkId])

    if (!url) return null
    return (
        <img
            src={url}
            alt="thumbnail"
            width={size}
            height={Math.round(size * 1.33)}
            style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
        />
    )
}