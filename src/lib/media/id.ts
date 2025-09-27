/** For chunkId like "doc_xxx_p7_c3" → baseId "doc_xxx" */
export function baseIdFromChunk(chunkId: string) {
    // find _p<digits>_c<digits> pattern
    const m = chunkId.match(/^(.*)_p\d+_c\d+$/)
    if (m) return m[1]
    // fallback for older IDs "doc_xxx_c3"
    const i = chunkId.lastIndexOf('_c')
    return i > 0 ? chunkId.slice(0, i) : chunkId
}

/** Extract page number from chunkId. Returns 1 if unknown/legacy. */
export function pageFromChunk(chunkId: string): number {
    const m = chunkId.match(/_p(\d+)_c\d+$/)
    if (m) return parseInt(m[1], 10)
    return 1
}

/* media keys */
export const pdfKeyForBase   = (baseId: string) => `pdf:${baseId}`
export const thumbKeyForPage = (baseId: string, page: number) => `thumb:${baseId}:p${page}`
export const thumbKeyForBase = (baseId: string) => `thumb:${baseId}:p1`
export const imgKeyForPage   = (baseId: string, page: number) => `img:${baseId}:p${page}`
export const imgKeyForInline = (baseId: string, page: number, i: number) => `img:${baseId}:p${page}:i${i}`

/** Parse media id back to base/page */
export function parseMediaId(id: string): { baseId: string; page?: number; inlineIndex?: number } {
    // img:xxx:p7:i2 | img:xxx:p7 | thumb:xxx:p3 | pdf:xxx
    const m = id.match(/^(thumb|img):([^:]+):p(\d+)(?::i(\d+))?$/)
    if (m) return { baseId: m[2], page: parseInt(m[3], 10), inlineIndex: m[4] ? parseInt(m[4], 10) : undefined }
    const m2 = id.match(/^pdf:([^:]+)$/)
    if (m2) return { baseId: m2[1] }
    return { baseId: id }
}