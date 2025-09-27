export function startOfDay(ts = Date.now()) {
    const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime()
}
export function formatDay(ts: number) {
    const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}