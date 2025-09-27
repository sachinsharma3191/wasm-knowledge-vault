/** Very simple edge-based crops from a page ImageBitmap. */
export async function extractInlineCropsFromBitmap(bmp: ImageBitmap, maxCrops = 3): Promise<ImageData[]> {
    const w = bmp.width, h = bmp.height
    const oc = new OffscreenCanvas(w, h)
    const ctx = oc.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(bmp, 0, 0)
    const img = ctx.getImageData(0, 0, w, h)
    const gray = new Uint8ClampedArray(w*h)
    for (let i=0, j=0; i<img.data.length; i+=4, j++) {
        const r=img.data[i], g=img.data[i+1], b=img.data[i+2]
        gray[j] = (r*0.299 + g*0.587 + b*0.114)|0
    }
    // Sobel edge magnitude
    const mag = new Float32Array(w*h)
    const gxK = [-1,0,1,-2,0,2,-1,0,1]
    const gyK = [-1,-2,-1,0,0,0,1,2,1]
    for (let y=1; y<h-1; y++) {
        for (let x=1; x<w-1; x++) {
            let gx=0, gy=0
            let k=0
            for (let yy=-1; yy<=1; yy++) for (let xx=-1; xx<=1; xx++,k++) {
                const v = gray[(y+yy)*w + (x+xx)]
                gx += v * gxK[k]; gy += v * gyK[k]
            }
            mag[y*w+x] = Math.hypot(gx, gy)
        }
    }
    // downsample grid buckets, pick top buckets
    const gxN = 12, gyN = 16
    const bx = Math.floor(w/gxN), by = Math.floor(h/gyN)
    const buckets: {x:number;y:number;s:number}[] = []
    for (let gy0=0; gy0<gyN; gy0++) {
        for (let gx0=0; gx0<gxN; gx0++) {
            let s = 0
            const x0 = gx0*bx, y0 = gy0*by
            for (let yy=0; yy<by; yy++) for (let xx=0; xx<bx; xx++) s += mag[(y0+yy)*w + (x0+xx)]
            buckets.push({ x:x0, y:y0, s })
        }
    }
    // take top-N buckets, expand to rectangles
    buckets.sort((a,b)=>b.s - a.s)
    const crops: ImageData[] = []
    const used: {x:number;y:number;w:number;h:number}[] = []
    for (const b of buckets.slice(0, gxN*gyN)) {
        const rect = { x: Math.max(0,b.x - Math.floor(0.5*bx)), y: Math.max(0,b.y - Math.floor(0.5*by)), w: Math.min(w - b.x, Math.floor(2*bx)), h: Math.min(h - b.y, Math.floor(2*by)) }
        // skip overlaps
        if (used.some(u => !(rect.x+rect.w < u.x || u.x+u.w < rect.x || rect.y+rect.h < u.y || u.y+u.h < rect.y))) continue
        used.push(rect)
        const sub = ctx.getImageData(rect.x, rect.y, rect.w, rect.h)
        crops.push(sub)
        if (crops.length >= maxCrops) break
    }
    return crops
}