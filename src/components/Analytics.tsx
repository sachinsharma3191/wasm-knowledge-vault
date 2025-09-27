import { useEffect, useMemo, useState } from 'react'
import { listEvents } from '../lib/storage/store'
import { startOfDay, formatDay } from '../lib/util/time'

type SeriesPoint = { day: string; uploads: number; searches: number; qa: number }

export default function Analytics() {
    const [events, setEvents] = useState<any[]>([])
    useEffect(() => { listEvents(2000).then(setEvents) }, [])

    const series = useMemo<SeriesPoint[]>(() => {
        const byDay = new Map<string, SeriesPoint>()
        const days = (n: number) => Array.from({ length: n }, (_, i) => startOfDay(Date.now() - i*86400000))
        for (const dayTs of days(14)) {
            byDay.set(formatDay(dayTs), { day: formatDay(dayTs), uploads: 0, searches: 0, qa: 0 })
        }
        for (const e of events) {
            const k = formatDay(startOfDay(e.ts))
            if (!byDay.has(k)) byDay.set(k, { day: k, uploads: 0, searches: 0, qa: 0 })
            const row = byDay.get(k)!
            if (e.kind === 'upload' || e.kind === 'paste') row.uploads++
            if (e.kind === 'search') row.searches++
            if (e.kind === 'qa') row.qa++
        }
        return Array.from(byDay.values()).sort((a,b)=>a.day.localeCompare(b.day))
    }, [events])

    const totals = useMemo(() => ({
        uploads: series.reduce((s, r) => s + r.uploads, 0),
        searches: series.reduce((s, r) => s + r.searches, 0),
        qa: series.reduce((s, r) => s + r.qa, 0),
    }), [series])

    return (
        <section style={{ marginTop: 24 }}>
            <h2>Analytics (last ~2 weeks)</h2>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <Stat label="Uploads" value={totals.uploads} />
                <Stat label="Searches" value={totals.searches} />
                <Stat label="Q&A" value={totals.qa} />
            </div>

            <Chart title="Daily activity" series={series} />
            <TopQueries events={events} />
        </section>
    )
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:'8px 12px', minWidth:120 }}>
            <div style={{ fontSize:12, opacity:.7 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:700 }}>{value}</div>
        </div>
    )
}

function Chart({ title, series }: { title: string; series: SeriesPoint[] }) {
    const w = 720, h = 140, pad = 20
    const maxY = Math.max(1, ...series.map(s => Math.max(s.uploads, s.searches, s.qa)))
    const stepX = (w - pad*2) / Math.max(1, series.length - 1)
    const y = (v:number) => h - pad - (v/maxY)*(h - pad*2)
    const x = (i:number) => pad + i*stepX

    const path = (key: keyof SeriesPoint) => series.map((s,i) => `${i?'L':'M'} ${x(i)} ${y(s[key] as number)}`).join(' ')
    return (
        <div style={{ marginTop: 12 }}>
            <div style={{ fontSize:12, opacity:.7, marginBottom:6 }}>{title}</div>
            <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title} style={{ background:'#fafafa', border:'1px solid #eee', borderRadius:8 }}>
                {/* axes */}
                <line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} stroke="#ddd" />
                <line x1={pad} y1={pad} x2={pad} y2={h-pad} stroke="#ddd" />
                {/* uploads (bars) */}
                {series.map((s,i)=>(
                    <rect key={i} x={x(i)-6} y={y(s.uploads)} width={12} height={Math.max(1,(h-pad)-y(s.uploads))} fill="#cbd5e1" />
                ))}
                {/* searches (line) */}
                <path d={path('searches')} fill="none" stroke="#64748b" strokeWidth={2}/>
                {/* qa (line) */}
                <path d={path('qa')} fill="none" stroke="#0ea5e9" strokeWidth={2}/>
            </svg>
            <div style={{ fontSize:11, opacity:.7, marginTop:4 }}>
                <span style={{ marginRight:12 }}>▮ uploads</span>
                <span style={{ marginRight:12 }}>— searches</span>
                <span>— Q&A</span>
            </div>
        </div>
    )
}

function TopQueries({ events }: { events: any[] }) {
    const counts = new Map<string, number>()
    for (const e of events) if (e.kind === 'search' && e.query) counts.set(e.query, (counts.get(e.query) || 0) + 1)
    const top = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8)
    if (!top.length) return null
    return (
        <div style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 6 }}>Top queries</h3>
            <ul style={{ paddingLeft: 18 }}>
                {top.map(([q,n]) => <li key={q}><code>{q}</code> <span style={{ opacity:.7 }}>× {n}</span></li>)}
            </ul>
        </div>
    )
}