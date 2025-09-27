export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    const buf = await blob.arrayBuffer()
    const audio = await ac.decodeAudioData(buf)
    // mixdown to mono
    const ch = audio.numberOfChannels
    const L = audio.length
    const mix = new Float32Array(L)
    for (let c = 0; c < ch; c++) {
        const data = audio.getChannelData(c)
        for (let i = 0; i < L; i++) mix[i] += data[i] / ch
    }
    // resample to 16000
    const srcRate = audio.sampleRate
    const dstRate = 16000
    if (srcRate === dstRate) return mix
    const ratio = srcRate / dstRate
    const N = Math.floor(L / ratio)
    const out = new Float32Array(N)
    for (let i = 0; i < N; i++) {
        const x = i * ratio
        const i0 = Math.floor(x), i1 = Math.min(L - 1, i0 + 1)
        const t = x - i0
        out[i] = mix[i0]*(1-t) + mix[i1]*t
    }
    return out
}