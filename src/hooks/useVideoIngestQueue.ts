import { useCallback, useRef, useState } from 'react'
import {ingestVideoFile, type VideoIngestOptions, type VideoIngestProgress} from "../lib/ingest/video-ingest.ts";

export type VideoJobState = {
    id: string
    fileName: string
    status: 'queued' | 'running' | 'done' | 'error' | 'cancelled'
    percent: number
    framesTotal?: number
    framesDone?: number
    error?: string
}

function progressFromStep(
    p: VideoIngestProgress,
    current?: VideoJobState
): { percent: number; framesTotal?: number; framesDone?: number } {
    if (p.step === 'start') return { percent: 0 }
    if (p.step === 'stored-original') return { percent: Math.max(10, current?.percent ?? 10) }
    if (p.step === 'poster') return { percent: Math.max(20, current?.percent ?? 20) }
    if (p.step === 'sampling') return { percent: Math.max(20, current?.percent ?? 20), framesTotal: p.total, framesDone: 0 }
    if (p.step === 'frame') {
        const total = current?.framesTotal ?? p.total
        const done = Math.min(p.index, total)
        const prog = 20 + (75 * done / Math.max(1, total)) // 20→95%
        return { percent: Math.max(current?.percent ?? 20, Math.min(95, prog)), framesTotal: total, framesDone: done }
    }
    if (p.step === 'done') return { percent: 100, framesTotal: current?.framesTotal, framesDone: current?.framesTotal }
    if (p.step === 'cancelled') return { percent: current?.percent ?? 0, framesTotal: current?.framesTotal, framesDone: current?.framesDone }
    return { percent: current?.percent ?? 0, framesTotal: current?.framesTotal, framesDone: current?.framesDone }
}

export default function useVideoIngestQueue() {
    const [jobs, setJobs] = useState<VideoJobState[]>([])
    const aborts = useRef(new Map<string, AbortController>())

    const start = useCallback(async (file: File, opts: Omit<VideoIngestOptions, 'signal' | 'onProgress'> = {}) => {
        const tempId = 'job_' + Math.random().toString(36).slice(2)
        setJobs(j => j.concat([{ id: tempId, fileName: file.name, status: 'queued', percent: 0 }]))
        const ctrl = new AbortController()
        aborts.current.set(tempId, ctrl)
        try {
            await ingestVideoFile(file, {
                ...opts,
                signal: ctrl.signal,
                onProgress: (p) => {
                    setJobs(j => {
                        let idx = j.findIndex(x => x.id === tempId || (p.step !== 'start' && x.id === (p as any).baseId))
                        if (idx === -1) idx = j.length - 1
                        const cur = j[idx] ?? { id: tempId, fileName: file.name, status: 'running', percent: 0 }
                        const id = (p as any).baseId || cur.id
                        const next = { ...cur, id, status: cur.status === 'queued' ? 'running' : cur.status } as VideoJobState
                        const { percent, framesDone, framesTotal } = progressFromStep(p, cur)
                        next.percent = percent
                        if (typeof framesTotal === 'number') next.framesTotal = framesTotal
                        if (typeof framesDone === 'number') next.framesDone = framesDone
                        if (p.step === 'cancelled') next.status = 'cancelled'
                        if (p.step === 'done') next.status = 'done'
                        const copy = j.slice()
                        copy[idx] = next
                        return copy
                    })
                },
            })
        } catch (e: any) {
            setJobs(j => j.map(x => x.id === tempId ? { ...x, status: 'error', error: String(e) } : x))
        } finally {
            aborts.current.delete(tempId)
        }
    }, [])

    const cancel = useCallback((id: string) => {
        const ctrl = aborts.current.get(id)
        if (ctrl) ctrl.abort()
        setJobs(j => j.map(x => x.id === id ? { ...x, status: 'cancelled' } : x))
    }, [])

    const clearFinished = useCallback(() => {
        setJobs(j => j.filter(x => x.status === 'running' || x.status === 'queued'))
    }, [])

    return { jobs, start, cancel, clearFinished }
}