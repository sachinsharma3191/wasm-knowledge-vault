type Params = {
    query: string; limit?: number; filterCollection?: string; filterTag?: string;
    tagBoost: number; collectionBoost: number; preferredCollection: string;
    tagWeights: string; excludeTags: string;
}
type Hit = { doc_id: string; score: number }

let worker: Worker | null = null
function getWorker() {
    if (!worker) worker = new Worker(new URL('../../workers/search-worker.ts', import.meta.url), { type: 'module' })
    return worker
}

export function runHybridSearch(p: Params): Promise<Hit[]> {
    return new Promise((resolve, reject) => {
        const w = getWorker()
        const handler = (e: MessageEvent<any>) => {
            const msg = e.data
            if (msg.type === 'result') { w.removeEventListener('message', handler); resolve(msg.hits) }
            if (msg.type === 'error') { w.removeEventListener('message', handler); reject(new Error(msg.error)) }
        }
        w.addEventListener('message', handler)
        w.postMessage({ type:'search', query: p.query, limit: p.limit ?? 12, filterCollection: p.filterCollection ?? '', filterTag: p.filterTag ?? '', tagBoost: p.tagBoost, collectionBoost: p.collectionBoost, preferredCollection: p.preferredCollection })
    })
}