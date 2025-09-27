import { useEffect, useMemo, useState } from 'react'
import { onProgress as onEmbedProgress } from '../lib/search/embedding-queue'
import { Helpers as H } from '../lib/helpers'
import { kvReady } from '../lib/search/kv-index'

export default function useEmbedProgress() {
    const [embedQueued, setEmbedQueued] = useState(0)
    const [embedDone, setEmbedDone] = useState(0)

    useEffect(() => {
        kvReady() // ensure wasm init kicked
        return onEmbedProgress(({ queued, done }) => {
            setEmbedQueued(queued)
            setEmbedDone(done)
        })
    }, [])

    const embedPct = useMemo(() => {
        const total = embedDone + embedQueued
        return H.percent(embedDone, total)
    }, [embedDone, embedQueued])

    return { embedQueued, embedDone, embedPct }
}