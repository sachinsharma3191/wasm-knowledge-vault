export class Helpers {
    /** Simple toast via alert; swap for your preferred toast lib later */
    static toast(msg: string, level: 'info' | 'error' = 'info') {
        if (level === 'error') console.error('[toast:error]', msg)
        // lightweight & dependable; replace with a nicer UI when ready
        alert(msg)
    }

    /** Clamp a number */
    static clamp(v: number, lo: number, hi: number) {
        return Math.max(lo, Math.min(hi, v))
    }

    /** Safe percentage 0..100 */
    static percent(done: number, total: number) {
        if (!total) return 0
        return this.clamp((done / total) * 100, 0, 100)
    }

    /** Debounce helper (returns a debounced function) */
    static debounce<T extends (...args: any[]) => any>(fn: T, ms = 250) {
        let t: any
        return (...args: Parameters<T>) => {
            clearTimeout(t)
            t = setTimeout(() => fn(...args), ms)
        }
    }

    /** Generate a compact unique-ish id with prefix */
    static uid(prefix = 'id') {
        const rand = Math.random().toString(36).slice(2, 8)
        return `${prefix}_${rand}`
    }

    /** Time-based id (good for ordering + uniqueness) */
    static nowId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    }

    /** Human-friendly bytes */
    static prettyBytes(n: number) {
        if (n < 1024) return `${n} B`
        const u = ['KB','MB','GB','TB']; let i = -1
        do { n = n / 1024; i++ } while (n >= 1024 && i < u.length - 1)
        return `${n.toFixed(1)} ${u[i]}`
    }

    /** Promise wrapper -> [err, data] */
    static async try<T>(p: Promise<T>): Promise<[any, T | undefined]> {
        try { return [null, await p] } catch (e) { return [e as any, undefined] }
    }

    /** Measure elapsed ms for an async fn */
    static async timeIt<T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> {
        const t0 = performance.now()
        const value = await fn()
        return { ms: performance.now() - t0, value }
    }

    static utf8Bytes(s: string) { return new TextEncoder().encode(s).byteLength }
}

// Named export alias
export const HelpersAlias = Helpers