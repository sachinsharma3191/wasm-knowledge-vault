export function chunkText(text: string, maxChars = 1200): string[] {
    if (text.length <= maxChars) return [text]
    const chunks: string[] = []
    let start = 0
    while (start < text.length) {
        const end = Math.min(start + maxChars, text.length)
        let cut = end
        // try to cut on sentence boundary
        const dot = text.lastIndexOf('.', end)
        if (dot > start + 200) cut = dot + 1
        chunks.push(text.slice(start, cut).trim())
        start = cut
    }
    return chunks
}