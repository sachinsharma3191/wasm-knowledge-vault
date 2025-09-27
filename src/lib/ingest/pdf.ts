import { getDocument } from 'pdfjs-dist'
import 'pdfjs-dist/build/pdf.worker.mjs'

/** Extract text per page. */
export async function extractPdfPages(file: File): Promise<string[]> {
    const buf = await file.arrayBuffer()
    const pdf = await getDocument({ data: buf }).promise
    const pages: string[] = []
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p)
        const content = await page.getTextContent()
        const strings = content.items.map((i: any) => ('str' in i ? i.str : '')).filter(Boolean)
        pages.push(strings.join(' ').trim())
    }
    await pdf.destroy()
    return pages
}

/** Render a page to thumbnail (WebP). */
export async function renderPdfPageThumbnail(file: File, pageNumber: number, maxWidth = 256): Promise<Blob> {
    const buf = await file.arrayBuffer()
    const pdf = await getDocument({ data: buf }).promise
    const page = await pdf.getPage(pageNumber)

    const viewport = page.getViewport({ scale: 1.0 })
    const scale = Math.min(1, maxWidth / viewport.width)
    const v2 = page.getViewport({ scale })

    const useOffscreen = typeof OffscreenCanvas !== 'undefined'
    const canvas: any = useOffscreen ? new OffscreenCanvas(v2.width, v2.height) : document.createElement('canvas')
    if (!useOffscreen) { canvas.width = Math.ceil(v2.width); canvas.height = Math.ceil(v2.height) }
    const ctx = canvas.getContext('2d') as any

    await page.render({ canvasContext: ctx, viewport: v2 }).promise
    let blob: Blob
    if (useOffscreen) {
        // @ts-ignore
        blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.92 })
    } else {
        blob = await new Promise<Blob>((resolve) => (canvas as HTMLCanvasElement).toBlob((b) => resolve(b as Blob), 'image/webp', 0.92))
    }
    await pdf.destroy()
    return blob
}

/** Full page raster (PNG) for indexing as image. */
export async function renderPdfPageImage(file: File, pageNumber: number, targetWidth = 768): Promise<Blob> {
    const buf = await file.arrayBuffer()
    const pdf = await getDocument({ data: buf }).promise
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1.0 })
    const scale = Math.min(2.0, targetWidth / viewport.width) // up to 2x
    const v2 = page.getViewport({ scale })

    const useOffscreen = typeof OffscreenCanvas !== 'undefined'
    const canvas: any = useOffscreen ? new OffscreenCanvas(v2.width, v2.height) : document.createElement('canvas')
    if (!useOffscreen) { canvas.width = Math.ceil(v2.width); canvas.height = Math.ceil(v2.height) }
    const ctx = canvas.getContext('2d') as any
    await page.render({ canvasContext: ctx, viewport: v2 }).promise

    let blob: Blob
    if (useOffscreen) {
        // @ts-ignore
        blob = await canvas.convertToBlob({ type: 'image/png' })
    } else {
        blob = await new Promise<Blob>((resolve) => (canvas as HTMLCanvasElement).toBlob(b => resolve(b as Blob), 'image/png'))
    }
    await pdf.destroy()
    return blob
}