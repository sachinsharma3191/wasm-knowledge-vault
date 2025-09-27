// Loads the wasm-bindgen JS glue and initializes the WASM module.
import initWasm, { KVIndex as WasmKVIndex } from '../../wasm/kv_index/kv_index.js'
import type { SearchHit } from './types'

let _ready: Promise<void> | null = null
let _kv: WasmKVIndex | null = null

export async function kvReady() {
    if (!_ready) {
        _ready = (async () => {
            await initWasm() // fetches kv_index_bg.wasm
            _kv = new WasmKVIndex()
        })()
    }
    return _ready
}

export function addDoc(docId: string, text: string) {
    if (!_kv) throw new Error('KV not ready')
    _kv.add_doc(docId, text)
}

export function search(query: string, k = 10): SearchHit[] {
    if (!_kv) throw new Error('KV not ready')
    const json = _kv.search(query, k)
    return JSON.parse(json) as SearchHit[]
}

export function getDoc(docId: string): string | null {
    if (!_kv) throw new Error('KV not ready')
    // wasm_bindgen Optional translates to null when absent
    return _kv.get_doc(docId)
}

export function clear() {
    if (!_kv) throw new Error('KV not ready')
    _kv.clear()
}