
const CACHE_STATIC = 'kv-static-v2';
const CACHE_MODELS = 'kv-models-v1';
const CACHE_WASM   = 'kv-wasm-v1';

const APP_SHELL = [
    '/',               // only works if SW scope is site root
    '/index.html',
    '/manifest.webmanifest',
];

// Precache basic shell
self.addEventListener('install', (event: any) => {
    self.skipWaiting();
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_STATIC);
        await cache.addAll(APP_SHELL);
    })());
});

// Clean old caches
self.addEventListener('activate', (event: any) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        const allow = new Set([CACHE_STATIC, CACHE_MODELS, CACHE_WASM]);
        await Promise.all(keys.filter(k => !allow.has(k)).map(k => caches.delete(k)));
        await (self as any).clients.claim();
    })());
});

// Strategy helpers
async function cacheFirst(event: any, cacheName: string) {
    const req = event.request as Request;
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);
    if (cached) return cached;
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
}

async function staleWhileRevalidate(event: any, cacheName: string) {
    const req = event.request as Request;
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);

    const fetchPromise = fetch(req).then(resp => {
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
    }).catch(() => undefined);

    return cached || fetchPromise || fetch(req);
}

self.addEventListener('fetch', (event: any) => {
    const req: Request = event.request;

    // Only GET is cacheable
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // 1) Model files served from /public/models (prefetched)
    if (url.origin === location.origin && url.pathname.startsWith('/models/')) {
        // models are immutable → cache-first
        event.respondWith(cacheFirst(event, CACHE_MODELS));
        return;
    }

    // 2) WASM files (your Rust wasm + ORT wasm)
    if (url.pathname.endsWith('.wasm')) {
        // wasm rarely changes → cache-first
        event.respondWith(cacheFirst(event, CACHE_WASM));
        return;
    }

    // 3) Static assets from same-origin (built JS/CSS/images)
    if (url.origin === location.origin) {
        // good default → stale-while-revalidate for app assets
        event.respondWith(staleWhileRevalidate(event, CACHE_STATIC));
        return;
    }

    // 4) Everything else (CDNs etc.) -> pass-through
    // (Optionally add a tiny cache for fonts/CDN with SWR too)
});