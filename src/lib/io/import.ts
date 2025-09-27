import JSZip from 'jszip'
import { putDoc, putEmbedding } from '../storage/store'
import { addDoc } from '../search/kv-index'

export async function importVaultZip(file: File) {
    const zip = await JSZip.loadAsync(file)
    const manStr = await zip.file('manifest.json')!.async('string')
    const manifest = JSON.parse(manStr) as { version: number; docs: string[] }

    for (const id of manifest.docs) {
        const docFile = zip.file(`docs/${id}.txt`)
        if (docFile) {
            const text = await docFile.async('string')
            await putDoc(id, text)
            addDoc(id, text)
        }
        const embFile = zip.file(`embeddings/${id}.bin`)
        if (embFile) {
            const ab = await embFile.async('arraybuffer')
            await putEmbedding(id, new Float32Array(ab))
        }
    }
    return { count: manifest.docs.length }
}