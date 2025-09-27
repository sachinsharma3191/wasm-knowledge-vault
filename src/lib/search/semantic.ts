// Lightweight hashed embedding (stable + fast). Swap with ONNX later.
const DIM = 1024

function hash(str: string) {
    // djb2
    let h = 5381
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i)
    return h >>> 0
}

function tokenize(text: string): string[] {
    return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}

export function embedText(text: string): Float32Array {
    const vec = new Float32Array(DIM)
    const toks = tokenize(text)
    for (const t of toks) {
        const idx = hash(t) % DIM
        vec[idx] += 1
    }
    // L2 normalize
    let norm = 0
    for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i]
    norm = Math.sqrt(norm) || 1
    for (let i = 0; i < DIM; i++) vec[i] /= norm
    return vec
}

export function cosine(a: Float32Array, b: Float32Array): number {
    const n = Math.min(a.length, b.length)
    let s = 0
    for (let i = 0; i < n; i++) s += a[i] * b[i]
    return s
}