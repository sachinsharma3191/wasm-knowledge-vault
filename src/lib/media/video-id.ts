export const videoKeyForBase    = (baseId: string) => `video:${baseId}`
export const vthumbKeyForBase   = (baseId: string) => `vthumb:${baseId}`
export const vframeKey = (baseId: string, ms: number) => `vframe:${baseId}:t${Math.round(ms)}`
export function parseVideoKey(id: string): { baseId: string; ms?: number } {
    const m = id.match(/^vframe:([^:]+):t(\d+)$/)
    if (m) return { baseId: m[1], ms: parseInt(m[2], 10) }
    const m2 = id.match(/^video:([^:]+)$/)
    if (m2) return { baseId: m2[1] }
    return { baseId: id }
}