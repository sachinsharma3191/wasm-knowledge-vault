import { search as bm25 } from '../search/kv-index'
import { rerankHybrid } from '../search/hybrid'
import { getDoc } from '../storage/store'
import { extractAnswer } from './extractive'

export async function ask(query: string) {
    // Retrieve
    const hits = bm25(query, 40)
    const reranked = await rerankHybrid(hits, query, 0.6)
    const top = reranked.slice(0, 6)

    // Load passages
    const passages: { id: string; text: string }[] = []
    for (const h of top) {
        const text = await getDoc(h.doc_id)
        if (text) passages.push({ id: h.doc_id, text })
    }
    // Extract
    return extractAnswer(query, passages, 5)
}