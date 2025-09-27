import React from 'react'

export default function SettingsBar({
                                        tagBoost, onChangeTagBoost,
                                        collectionBoost, onChangeCollectionBoost,
                                        preferredCollection, onChangePreferredCollection,
                                        tagWeights, onChangeTagWeights,
                                        excludeTags, onChangeExcludeTags,
                                    }: {
    tagBoost: number; onChangeTagBoost: (v: number) => void
    collectionBoost: number; onChangeCollectionBoost: (v: number) => void
    preferredCollection: string; onChangePreferredCollection: (v: string) => void;
    tagWeights: string; onChangeTagWeights: (s: string)=>void; excludeTags: string; onChangeExcludeTags: (s:string)=>void
}) {
    return (
        <section style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 16, margin: '8px 0' }}>Ranking Settings</h2>

            <div style={{ display:'flex', gap:18, flexWrap:'wrap', alignItems:'center' }}>
                <div style={box}>
                    <label style={label}>Tag boost</label>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <input type="range" min={0} max={1} step={0.05}
                               value={tagBoost}
                               onChange={e => onChangeTagBoost(parseFloat(e.target.value))}/>
                        <code>{tagBoost.toFixed(2)}</code>
                    </div>
                    <small style={hint}>Adds weight when query text contains a doc tag.</small>
                </div>

                <div style={box}>
                    <label style={label}>Collection boost</label>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <input type="range" min={0} max={1} step={0.05}
                               value={collectionBoost}
                               onChange={e => onChangeCollectionBoost(parseFloat(e.target.value))}/>
                        <code>{collectionBoost.toFixed(2)}</code>
                    </div>
                    <small style={hint}>Adds weight for docs in your preferred collection.</small>
                </div>
                <div style={box}>
                    <label style={label}>Per-tag weights</label>
                    <textarea
                        value={tagWeights}
                        onChange={e => onChangeTagWeights(e.target.value)}
                        placeholder={'important:0.6\nobsolete:-0.3'}
                        rows={3}
                        style={{ width: 320 }}
                    />
                    <small style={hint}>One per line: <code>tag:weight</code>. Positive boosts, negative penalties.</small>
                </div>

                <div style={box}>
                    <label style={label}>Exclude tags</label>
                    <input
                        value={excludeTags}
                        onChange={e => onChangeExcludeTags(e.target.value)}
                        placeholder="draft,private,archive"
                        style={{ padding: 8, minWidth: 220 }}
                    />
                    <small style={hint}>Docs with any excluded tag are filtered out.</small>
                </div>
                <div style={box}>
                    <label style={label}>Preferred collection</label>
                    <input
                        value={preferredCollection}
                        onChange={e => onChangePreferredCollection(e.target.value)}
                        placeholder="e.g. Work, Research…"
                        style={{ padding: 8, minWidth: 220 }}
                    />
                    <small style={hint}>Leave empty to disable collection boost.</small>
                </div>
            </div>
        </section>
    )
}

const box: React.CSSProperties = { border:'1px solid #eee', borderRadius:8, padding:10 }
const label: React.CSSProperties = { display:'block', fontWeight:600, marginBottom:6 }
const hint: React.CSSProperties = { display:'block', opacity:0.7, marginTop:6 }