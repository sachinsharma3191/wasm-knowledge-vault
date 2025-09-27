import type { SearchHit } from './types'
import { embedTextReal } from './embeddings'
import { getEmbedding, putEmbedding, getDoc } from '../storage/store'

export async function rerankHybrid(
    hits: SearchHit[],
    query: string,
    alpha = 0.6
): Promise<SearchHit[]> {
    let qv = await embedTextReal(query)

    const rescored: SearchHit[] = []
    for (const h of hits) {
        let dv = await getEmbedding(h.doc_id)
        if (!dv) {
            const text = await getDoc(h.doc_id)
            if (text) {
                dv = await embedTextReal(text)
                await putEmbedding(h.doc_id, dv)
            } else {
                // empty vector fallback of same length as qv
                dv = new Float32Array(qv.length)
            }
        }
        // cosine on normalized vectors = dot product
        const dot = dotProduct(qv, dv)
        rescored.push({ doc_id: h.doc_id, score: alpha * h.score + (1 - alpha) * dot })
    }
    rescored.sort((a, b) => b.score - a.score)
    return rescored
}

function dotProduct(a: Float32Array, b: Float32Array) {
    const n = Math.min(a.length, b.length)
    let s = 0
    for (let i = 0; i < n; i++) s += a[i] * b[i]
    return s
}