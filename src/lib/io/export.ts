import JSZip from 'jszip'
import { saveAs } from "file-saver"
import { listDocIds, getDoc, getEmbedding } from '../storage/store'

export async function exportVaultZip() {
    const zip = new JSZip()
    const manifest: any = { version: 1, docs: [] as string[] }
    const ids = await listDocIds()
    for (const id of ids) {
        const text = await getDoc(id)
        if (!text) continue
        zip.file(`docs/${id}.txt`, text)
        manifest.docs.push(id)
        const vec = await getEmbedding(id)
        if (vec) {
            const buf = new Uint8Array(vec.buffer.slice(0))
            zip.file(`embeddings/${id}.bin`, buf)
        }
    }
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, 'vault.zip')
}