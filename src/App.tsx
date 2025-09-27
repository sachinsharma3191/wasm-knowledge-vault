import React, {useState} from 'react'
import HistoryPanel from './components/HistoryPanel'
import ResultItem from './components/ResultItem'
import CollectionPicker from './components/CollectionPicker'
import ProgressBar from './components/ProgressBar'
import SavedSearches from './components/SavedSearch'
import SettingsBar from './components/SettingsBar'
import useEmbedProgress from './hooks/useEmbedProgress'
import useIngest from './hooks/useIngest'
import useSearch from './hooks/useSearch'
import useQA from './hooks/useQA'
import useSettings from './hooks/useSettings'
import ImageSearch from "./components/ImageSearch.tsx";
import {ask} from "./lib/ai/rag.ts";
import QACitations from "./components/QaCitations.tsx";
import Analytics from "./components/Analytics.tsx";
import CollectionManager from "./components/CollectionManager.tsx";
import VoiceQA from "./components/VoiceQA.tsx";
import ExportImport from "./components/ExportImport.tsx";
import VideoSearch from "./components/VideoSearch.tsx";
import VideoIngestProgress from "./components/VideoProgress.tsx";


export function QABox() {
    const [question, setQuestion] = useState('')
    const [answer, setAnswer] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleAsk() {
        setLoading(true)
        try {
            const res = await ask(question, 3)
            setAnswer(res.answer)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="qa-box">
            <h3>Ask your vault</h3>
            <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask a question about your docs..."
            />
            <button onClick={handleAsk} disabled={loading}>
                {loading ? 'Thinking...' : 'Ask'}
            </button>
            {answer && (
                <div className="qa-answer">
                    <strong>Answer:</strong> {answer}
                </div>
            )}
        </div>
    )
}


export default function App() {
    const { ready, busy, setBusy, ingestText, setIngestText, ingestCollection, setIngestCollection, onDrop, handleFiles, handleIngestText, doExport, doImport, doClear } =
        useIngest()

    const { tagBoost, setTagBoost, collectionBoost, setCollectionBoost, preferredCollection, setPreferredCollection, tagWeights, setTagWeights, excludeTags, setExcludeTags } = useSettings()
    const { query, setQuery, filterCollection, setFilterCollection, filterTag, setFilterTag, hits, handleSearch, fetchText, runSavedSearch } =
        useSearch({ setBusy, tagBoost })

    const { qaQ, setQaQ, qaA, handleAsk } = useQA({ setBusy })
    const { embedDone, embedQueued, embedPct } = useEmbedProgress()

    if (!ready) return <div style={{ padding: 20 }}>Loading WASM index…</div>

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
            <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
                <h1 style={{ fontSize: 28, margin: 0 }}>Knowledge Vault</h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <small style={{ opacity: 0.8 }}>
                        Embeddings: {embedDone} done{embedQueued ? ` • ${embedQueued} queued` : ''}
                    </small>
                    <ProgressBar value={embedPct} width={160} />
                </div>
            </header>

            {/* Settings */}
            <SettingsBar
                tagBoost={tagBoost} onChangeTagBoost={setTagBoost}
                collectionBoost={collectionBoost} onChangeCollectionBoost={setCollectionBoost}
                preferredCollection={preferredCollection} onChangePreferredCollection={setPreferredCollection}
                tagWeights={tagWeights} onChangeTagWeights={setTagWeights}
                excludeTags={excludeTags} onChangeExcludeTags={setExcludeTags}
            />

            {/* Ingest */}
            <section style={{ marginTop: 20 }}>
                <h2>Ingest</h2>
                <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} style={{ border: '2px dashed #999', borderRadius: 8, padding: 16, marginBottom: 8, textAlign: 'center' }}>
                    Drag & drop PDFs / TXT / MD here
                    <div style={{ marginTop: 8 }}><input type="file" multiple accept=".pdf,.txt,.md,text/markdown" onChange={(e) => handleFiles(e.target.files)} /></div>
                </div>
                <textarea value={ingestText} onChange={(e) => setIngestText(e.target.value)} placeholder="…or paste text here" style={{ width: '100%', height: 130 }} />
                <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap', alignItems:'center' }}>
                    <CollectionPicker value={ingestCollection} onChange={setIngestCollection} placeholder="Collection (optional)" />
                    <button onClick={handleIngestText} disabled={busy}>Add</button>
                    <button onClick={doClear} disabled={busy}>Clear Vault</button>
                    <button onClick={doExport} disabled={busy}>Export Zip</button>
                    <label style={{ display:'inline-block' }}>
                        <span style={btnLike}>Import Zip</span>
                        <input type="file" accept=".zip" style={{ display:'none' }} onChange={(e) => doImport(e.target.files?.[0] ?? null)} />
                    </label>
                </div>
            </section>

            {/* Search */}
            <section style={{ marginTop: 20 }}>
                <h2>Search</h2>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a query…" style={{ width: '100%', padding: 8 }} />
                <div style={{ display:'flex', gap:12, alignItems:'center', marginTop:8, flexWrap:'wrap' }}>
                    <CollectionPicker value={filterCollection} onChange={setFilterCollection} placeholder="Filter by collection (leave empty = All)" />
                    <input value={filterTag} onChange={e => setFilterTag(e.target.value)} placeholder="Filter by tag (optional)" style={{ padding: 8, minWidth: 200 }} />
                    <button onClick={handleSearch} disabled={busy || !query.trim()}>{busy ? 'Searching…' : 'Search'}</button>
                </div>

                {/* Saved searches */}
                <SavedSearches current={{ query, collection: filterCollection, tag: filterTag }} onRun={runSavedSearch} />

                <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                    {hits.map((h) => (
                        <ResultItem key={h.doc_id} id={h.doc_id} score={h.score} query={query} fetcher={fetchText} />
                    ))}
                </ul>
            </section>

            {/* IMAGE SEARCH */}
            <ImageSearch />

            {/* Q&A */}
            <section style={{ marginTop: 24 }}>
                <h2>Q&A</h2>
                <input value={qaQ} onChange={(e) => setQaQ(e.target.value)} placeholder="Ask a question…" style={{ width: '100%', padding: 8 }} />
                <button style={{ marginTop: 8 }} onClick={handleAsk} disabled={busy || !qaQ.trim()}>{busy ? 'Thinking…' : 'Ask'}</button>
                {qaA && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ padding: 10, background: '#f6f6f6', borderRadius: 6 }}>{qaA.answer}</div>
                        <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>Citations:&nbsp;{qaA.citations.map((id, i) => <span key={id}>{i ? ', ' : ''}{id}</span>)}</div>
                        <QACitations ids={qaA.citations} query={qaQ} />
                    </div>
                )}
            </section>

            <VideoSearch />
            <VideoIngestProgress />
            {/* History */}
            <HistoryPanel />

            {/* ANALYTICS */}
            <Analytics />

            {/* COLLECTIONS MANAGER */}
            <CollectionManager />

            {/* VOICE Q&A */}
            <VoiceQA />
            // … inside JSX:
            <ExportImport />

        </div>
    )
}

const btnLike: React.CSSProperties = {
    display: 'inline-block',
    padding: '6px 10px',
    background: '#eee',
    borderRadius: 6,
    cursor: 'pointer',
}