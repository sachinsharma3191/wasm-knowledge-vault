// src/ingest/video-ingest.ts
// High-level, cancelable video ingestion with progress callbacks.


import {addEvent, putMediaBlob, setMeta} from "../storage/store.ts";
import {vframeKey, videoKeyForBase, vthumbKeyForBase} from "../media/video-id.ts";
import {grabPoster, sampleVideoFrames} from "../media/video-extract.ts";
import {enqueueImageEmbedding} from "../search/clip-queue.ts";
import { Helpers as H } from '../helpers'


export type VideoIngestOptions = {
    collection?: string
    strideSec?: number          // frame sampling stride (seconds), default 2
    maxFrames?: number          // cap total frames per video, default 100
    frameWidth?: number         // resize width for sampled frames, default 512
    posterAtSec?: number        // time for poster grab, default 0.2
    posterWidth?: number        // poster width, default 640
    tagList?: string[]          // optional tags applied to each frame meta
    onProgress?: (p: VideoIngestProgress) => void
    signal?: AbortSignal        // optional cancel
}

export type VideoIngestProgress =
    | { step: 'start'; fileName: string; baseId: string }
    | { step: 'stored-original'; baseId: string }
    | { step: 'poster'; baseId: string; ok: boolean }
    | { step: 'sampling'; baseId: string; total: number }
    | { step: 'frame'; baseId: string; index: number; total: number; ms: number }
    | { step: 'done'; baseId: string; frames: number }
    | { step: 'cancelled'; baseId: string }

export async function ingestVideoFile(file: File, opts: VideoIngestOptions = {}) {
    const {
        collection,
        strideSec = 2,
        maxFrames = 100,
        frameWidth = 512,
        posterAtSec = 0.2,
        posterWidth = 640,
        tagList = [],
        onProgress,
        signal,
    } = opts

    const baseId = H.nowId('vid')
    const notify = (p: VideoIngestProgress) => { try { onProgress?.(p) } catch {} }
    const cancelled = () => signal?.aborted

    notify({ step: 'start', fileName: file.name, baseId })

    // 1) Store original blob
    if (cancelled()) { notify({ step: 'cancelled', baseId }); return baseId }
    await putMediaBlob(videoKeyForBase(baseId), file, file.type || 'video/mp4')
    notify({ step: 'stored-original', baseId })

    // 2) Poster
    if (!cancelled()) {
        try {
            const poster = await grabPoster(file, posterAtSec, posterWidth)
            await putMediaBlob(vthumbKeyForBase(baseId), poster, 'image/png')
            notify({ step: 'poster', baseId, ok: true })
        } catch {
            notify({ step: 'poster', baseId, ok: false })
        }
    } else { notify({ step: 'cancelled', baseId }); return baseId }

    // 3) Sample frames
    if (cancelled()) { notify({ step: 'cancelled', baseId }); return baseId }
    const frames = await sampleVideoFrames(file, strideSec, maxFrames, frameWidth)
    notify({ step: 'sampling', baseId, total: frames.length })

    // 4) Store frames + enqueue CLIP embeddings + set meta
    for (let i = 0; i < frames.length; i++) {
        if (cancelled()) { notify({ step: 'cancelled', baseId }); return baseId }
        const fr = frames[i]
        const frameId = vframeKey(baseId, fr.ms)

        await putMediaBlob(frameId, fr.blob, 'image/png')
        await setMeta(frameId, tagList.slice(), collection?.trim() || undefined, baseId) // reuse 'collection' and store parent baseId if your setMeta signature supports it
        // Enqueue CLIP embedding (ImageData path avoids re-decode)
        await enqueueImageEmbedding(frameId, fr.imageData)

        notify({ step: 'frame', baseId, index: i + 1, total: frames.length, ms: fr.ms })
    }

    // 5) Log event
    await addEvent({
        id: H.nowId('ev'),
        kind: 'upload',
        ts: Date.now(),
        fileName: file.name,
        byteSize: file.size,
        chunks: frames.length,
    } as any)

    notify({ step: 'done', baseId, frames: frames.length })
    return baseId
}

/* Helper to wrap AbortController for convenience */
export function withAbort<T extends any[]>(fn: (...args: T) => Promise<any>) {
    const ctrl = new AbortController()
    return {
        signal: ctrl.signal,
        cancel: () => ctrl.abort(),
        run: (...args: T) => fn(...args),
    }
}