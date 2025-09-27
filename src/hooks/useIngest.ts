import { useCallback, useEffect, useState } from 'react'
import { kvReady, addDoc, clear as clearWasm } from '../lib/search/kv-index'
import { putDoc, clearAll, addEvent, putMediaBlob, setMeta } from '../lib/storage/store'
import { chunkText } from '../lib/ingest/chunk'
import { enqueue as enqueueEmbed, resetProgress as resetEmbedProgress } from '../lib/search/embedding-queue'
import { exportVaultZip } from '../lib/io/export'
import { importVaultZip } from '../lib/io/import'
import { Helpers as H } from '../lib/helpers'
import {pdfKeyForBase, thumbKeyForPage, imgKeyForPage, imgKeyForInline} from "../lib/media/id.ts";
import {extractPdfPages, renderPdfPageImage, renderPdfPageThumbnail} from "../lib/ingest/pdf.ts";
import {enqueueImageEmbedding} from "../lib/search/clip-queue.ts";
import {extractInlineCropsFromBitmap} from "../lib/media/inline-extract.ts";

export default function useIngest() {
    const [ready, setReady] = useState(false)
    const [busy, setBusy] = useState(false)
    const [ingestText, setIngestText] = useState('')
    const [ingestCollection, setIngestCollection] = useState('')

    useEffect(() => { kvReady().then(() => setReady(true)) }, [])

    const ingestChunks = useCallback(async (text: string, baseId?: string) => {
        const root = baseId ?? H.nowId('doc')
        const chunks = chunkText(text)
        for (let i = 0; i < chunks.length; i++) {
            const id = `${root}_c${i}`
            await putDoc(id, chunks[i])
            addDoc(id, chunks[i])
            enqueueEmbed(id, chunks[i])
            if (ingestCollection.trim()) await setMeta(id, [], ingestCollection.trim())
        }
        return { count: chunks.length, baseId: root }
    }, [ingestCollection])


    const handleIngestText = useCallback(async () => {
        if (!ingestText.trim()) return
        setBusy(true)
        try {
            const n = await ingestChunks(ingestText)
            const bytes = new TextEncoder().encode(ingestText).byteLength
            await addEvent({ id: H.nowId('ev'), kind: 'paste', ts: Date.now(), byteSize: bytes, chunks: n } as any)
            setIngestText('')
            H.toast(`Ingested ${n} chunk(s).`)
        } catch (e) {
            console.error(e); H.toast('Ingest failed. See console.', 'error')
        } finally { setBusy(false) }
    }, [ingestText, ingestChunks])

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return
        setBusy(true)
        let total = 0
        try {
            for (const f of Array.from(files)) {
                const ext = f.name.split('.').pop()?.toLowerCase()

                if (ext === 'pdf') {
                    const baseId = H.nowId('doc')
                    // store original PDF for viewer
                    try { await putMediaBlob(pdfKeyForBase(baseId), f, 'application/pdf') } catch {}

                    const pages = await extractPdfPages(f)
                    let chunkCount = 0

                    for (let p = 0; p < pages.length; p++) {
                        const pageNo = p + 1
                        const pageText = pages[p]
                        if (pageText) {
                            const chunks = chunkText(pageText)
                            for (let i = 0; i < chunks.length; i++) {
                                const id = `${baseId}_p${pageNo}_c${i}`
                                await putDoc(id, chunks[i]); addDoc(id, chunks[i]); enqueueEmbed(id, chunks[i])
                                if (ingestCollection.trim()) await setMeta(id, [], ingestCollection.trim(), baseId, pageNo)
                                else await setMeta(id, [], undefined, baseId, pageNo)
                            }
                            chunkCount += chunks.length
                        }

                        // Thumbnail (small)
                        try {
                            const thumbBlob = await renderPdfPageThumbnail(f, pageNo, 256)
                            await putMediaBlob(thumbKeyForPage(baseId, pageNo), thumbBlob, 'image/webp')
                        } catch (e) {
                            console.warn('thumb failed p', pageNo, e)
                        }

                        // Full page "scan" (PNG) for CLIP
                        try {
                            const imgBlob = await renderPdfPageImage(f, pageNo, 768)
                            const imgKey = imgKeyForPage(baseId, pageNo)
                            await putMediaBlob(imgKey, imgBlob, 'image/png')

                            // Queue CLIP embedding
                            const bmp = await createImageBitmap(imgBlob)
                            const oc = new OffscreenCanvas(bmp.width, bmp.height)
                            const ctx = oc.getContext('2d')!
                            ctx.drawImage(bmp, 0, 0)
                            const imgData = ctx.getImageData(0, 0, bmp.width, bmp.height)
                            const crops = await extractInlineCropsFromBitmap(bmp, 3) // up to 3 inline crops
                            let ci = 0
                            for (const crop of crops) {
                                // turn ImageData into Blob
                                const oc2 = new OffscreenCanvas(crop.width, crop.height)
                                const ctx2 = oc2.getContext('2d')!
                                ctx2.putImageData(crop, 0, 0)
                                // @ts-ignore
                                const cropBlob: Blob = await oc2.convertToBlob({ type: 'image/png' })
                                const key = imgKeyForInline(baseId, pageNo, ci++)
                                await putMediaBlob(key, cropBlob, 'image/png')
                                await enqueueImageEmbedding(imgKey, imgData)
                            }
                        } catch (e) {
                            console.warn('full image failed p', pageNo, e)
                        }
                    }

                    total += chunkCount
                    await addEvent({ id: H.nowId('ev'), kind: 'upload', ts: Date.now(), fileName: f.name, byteSize: f.size, chunks: chunkCount } as any)
                } else {
                    // (unchanged text/md branch)
                    const text = await f.text()
                    const baseId = H.nowId('doc')
                    const chunks = chunkText(text)
                    for (let i = 0; i < chunks.length; i++) {
                        const id = `${baseId}_c${i}`
                        await putDoc(id, chunks[i]); addDoc(id, chunks[i]); enqueueEmbed(id, chunks[i])
                        if (ingestCollection.trim()) await setMeta(id, [], ingestCollection.trim(), baseId)
                        else await setMeta(id, [], undefined, baseId)
                    }
                    total += chunks.length
                    await addEvent({ id: H.nowId('ev'), kind: 'upload', ts: Date.now(), fileName: f.name, byteSize: f.size, chunks: chunks.length } as any)
                }
            }
            H.toast(`Ingested ${total} chunk(s) from ${files.length} file(s).`)
        } catch (e) {
            console.error(e); H.toast('File ingest failed. See console.', 'error')
        } finally { setBusy(false) }
    }, [ingestChunks])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
    }, [handleFiles])

    const doExport = useCallback(async () => {
        try { await exportVaultZip() } catch (e) { console.error(e); H.toast('Export failed. See console.', 'error') }
    }, [])

    const doImport = useCallback(async (file: File | null) => {
        if (!file) return
        setBusy(true)
        try { const res = await importVaultZip(file); H.toast(`Imported ${res.count} items from ${file.name}`) }
        catch (e) { console.error(e); H.toast('Import failed. See console.', 'error') }
        finally { setBusy(false) }
    }, [])

    const doClear = useCallback(async () => {
        setBusy(true)
        try {
            clearWasm(); await clearAll(); resetEmbedProgress()
            H.toast('Vault cleared.')
        } finally { setBusy(false) }
    }, [])

    return {
        ready, busy, setBusy,
        ingestText, setIngestText,
        ingestCollection, setIngestCollection,
        onDrop, handleFiles, handleIngestText,
        doExport, doImport, doClear,
    }
}