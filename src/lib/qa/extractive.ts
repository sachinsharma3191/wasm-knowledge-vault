// Simple sentence scoring: rank by query token overlap + position + rarity
function sentences(text: string): string[] {
    return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
}
function toks(s: string) {
    return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}
export function extractAnswer(query: string, passages: { id: string; text: string }[], maxSent = 5) {
    const q = new Set(toks(query))
    // compute sentence scores
    const scored: { id: string; sent: string; score: number }[] = []
    passages.forEach((p, pi) => {
        const ss = sentences(p.text).slice(0, 12) // cap per chunk
        ss.forEach((s, si) => {
            const ts = toks(s)
            const overlap = ts.filter(t => q.has(t)).length
            const unique = new Set(ts).size
            const posBonus = 1 / (1 + si) + 1 / (1 + pi)
            const score = overlap * 2 + unique * 0.05 + posBonus
            scored.push({ id: p.id, sent: s, score })
        })
    })
    scored.sort((a, b) => b.score - a.score)
    // dedupe near-duplicate sentences by Jaccard
    const picked: typeof scored = []
    const seen = [] as string[] // store normalized
    for (const s of scored) {
        const n = toks(s.sent)
        if (seen.some(prev => jaccard(prev, n) > 0.8)) continue
        picked.push(s)
        seen.push(n.join(' '))
        if (picked.length >= maxSent) break
    }
    // Group citations by id in the order sentences appear
    const answer = picked.map(p => p.sent).join(' ')
    const citations = Array.from(new Set(picked.map(p => p.id)))
    return { answer, citations }
}
function jaccard(aStr: string, bTokens: string[]) {
    const a = new Set(aStr.split(' '))
    const b = new Set(bTokens)
    const inter = [...a].filter(x => b.has(x)).length
    const uni = a.size + b.size - inter
    return uni ? inter / uni : 0
}