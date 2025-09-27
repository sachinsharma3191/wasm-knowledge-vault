export async function grabPoster(videoFile: File, atSec = 0.2, width = 640): Promise<Blob> {
    const vid = await loadVideoFromFile(videoFile)
    await seek(vid, atSec)
    const blob = await drawFrameToBlob(vid, width)
    vid.remove()
    return blob
}

/** Sample frames every `strideSec` (limit frames). Returns [{ms, blob, imageData}] */
export async function sampleVideoFrames(
    videoFile: File,
    strideSec = 2,
    maxFrames = 100,
    width = 512
): Promise<Array<{ ms: number; blob: Blob; imageData: ImageData }>> {
    const vid = await loadVideoFromFile(videoFile)
    const dur = vid.duration || 0
    const frames: Array<{ ms: number; blob: Blob; imageData: ImageData }> = []
    const total = Math.min(maxFrames, Math.ceil(dur / strideSec))
    let cur = 0
    while (cur < total) {
        const t = Math.min(dur, cur * strideSec)
        await seek(vid, t)
        const { blob, imageData } = await drawFrameToBlobAndImageData(vid, width)
        frames.push({ ms: Math.round(t * 1000), blob, imageData })
        cur++
        // yield to UI thread
        await new Promise(r => setTimeout(r, 0))
    }
    vid.remove()
    return frames
}

/* --------------- helpers --------------- */
async function loadVideoFromFile(file: File): Promise<HTMLVideoElement> {
    const url = URL.createObjectURL(file)
    const vid = document.createElement('video')
    vid.src = url
    vid.crossOrigin = 'anonymous'
    vid.muted = true
    vid.playsInline = true
    await once(vid, 'loadeddata')
    // iOS sometimes needs play/pause to decode first frame
    try { await vid.play(); vid.pause() } catch {}
    return vid
}
function once(el: EventTarget, ev: string) {
    return new Promise<void>(res => el.addEventListener(ev, () => res(), { once: true }))
}
function seek(vid: HTMLVideoElement, tSec: number) {
    return new Promise<void>((resolve) => {
        const on = () => { vid.removeEventListener('seeked', on); resolve() }
        vid.addEventListener('seeked', on)
        try { vid.currentTime = Math.max(0, Math.min(vid.duration || tSec, tSec)) } catch { resolve() }
    })
}
async function drawFrameToBlob(vid: HTMLVideoElement, width: number): Promise<Blob> {
    const scale = width / vid.videoWidth
    const w = Math.round(vid.videoWidth * scale)
    const h = Math.round(vid.videoHeight * scale)
    const useOff = typeof OffscreenCanvas !== 'undefined'
    const canvas: any = useOff ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(vid, 0, 0, w, h)
    if (useOff) {
        // @ts-ignore
        return await canvas.convertToBlob({ type: 'image/png' })
    }
    return await new Promise<Blob>(r => (canvas as HTMLCanvasElement).toBlob(b => r(b!), 'image/png'))
}
async function drawFrameToBlobAndImageData(vid: HTMLVideoElement, width: number) {
    const scale = width / vid.videoWidth
    const w = Math.round(vid.videoWidth * scale)
    const h = Math.round(vid.videoHeight * scale)
    const useOff = typeof OffscreenCanvas !== 'undefined'
    const canvas: any = useOff ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(vid, 0, 0, w, h)
    let blob: Blob
    if (useOff) {
        // @ts-ignore
        blob = await canvas.convertToBlob({ type: 'image/png' })
    } else {
        blob = await new Promise<Blob>(r => (canvas as HTMLCanvasElement).toBlob(b => r(b!), 'image/png'))
    }
    const imageData = ctx.getImageData(0, 0, w, h)
    return { blob, imageData }
}   