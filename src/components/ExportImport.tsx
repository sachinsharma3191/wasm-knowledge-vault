import React, { useState } from 'react'
import { exportVault, importVault } from '../lib/storage/store'

export default function ExportImport() {
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string>('')

    async function handleExport() {
        setBusy(true); setMsg('')
        try {
            const blob = await exportVault({ includeMedia: false })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `kv-vault-export-${new Date().toISOString().slice(0,10)}.json`
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
            setMsg('Exported.')
        } finally { setBusy(false) }
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]; if (!f) return
        setBusy(true); setMsg('')
        try {
            await importVault(f)
            setMsg('Imported successfully. Reload recommended.')
        } catch (err:any) {
            setMsg('Import failed: ' + String(err))
        } finally { setBusy(false); e.target.value = '' }
    }

    return (
        <section style={{ marginTop: 24 }}>
            <h2>Export / Import Vault</h2>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <button onClick={handleExport} disabled={busy}>{busy ? 'Working…' : 'Export JSON'}</button>
                <label style={{ display:'inline-block' }}>
                    <input type="file" accept="application/json" onChange={handleImport} style={{ display:'none' }} />
                    <span style={{ border:'1px solid #ccc', padding:'6px 10px', borderRadius:6, cursor:'pointer' }}>Import JSON…</span>
                </label>
                {msg && <span style={{ marginLeft:8, fontSize:12, opacity:.7 }}>{msg}</span>}
            </div>
        </section>
    )
}