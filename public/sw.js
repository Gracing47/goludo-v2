/**
 * GoLudo Service Worker
 * Provides offline resilience and caching for the PWA
 * 
 * Strategy:
 * - Static assets: Cache-first (fast loading)
 * - API calls: Network-first (fresh data)
 * - Socket.IO: Network-only (real-time required)
 */

const CACHE_NAME = 'goludo-v1';
const STATIC_CACHE = 'goludo-static-v1';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    // Audio files for offline play
    '/sounds/roll.mp3',
    '/sounds/move.mp3',
    '/sounds/capture.mp3',
    '/sounds/spawn.mp3',
    '/sounds/land.mp3',
    '/sounds/home.mp3',
    '/sounds/bonus.mp3',
    '/sounds/click.mp3',
    '/sounds/win.mp3',
    '/sounds/penalty.mp3'
];

// Install - pre-cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pre-caching static assets');
                return cache.addAll(PRECACHE_ASSETS).catch(err => {
                    console.warn('[SW] Some assets failed to cache:', err);
                    // Continue even if some assets fail
                });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - smart caching strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip Socket.IO requests - they must be real-time
    if (url.pathname.includes('/socket.io')) {
        return;
    }

    // Skip API requests - use network-first
    if (url.pathname.startsWith('/api')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Static assets - cache-first
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // HTML/navigation - network-first with cache fallback
    if (event.request.mode === 'navigate') {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Default: network with cache fallback
    event.respondWith(networkFirst(event.request));
});

/**
 * Cache-first strategy
 * Best for static assets that rarely change
 */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        const url = new URL(request.url);
        if (response.ok && request.method === 'GET' && (url.protocol === 'http:' || url.protocol === 'https:')) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn('[SW] Fetch failed:', request.url);
        // Return offline fallback if available
        return caches.match('/index.html');
    }
}

/**
 * Network-first strategy
 * Best for dynamic content and API calls
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        const url = new URL(request.url);
        if (response.ok && request.method === 'GET' && (url.protocol === 'http:' || url.protocol === 'https:')) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn('[SW] Network failed, trying cache:', request.url);
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }

        // For navigation, return index.html
        if (request.mode === 'navigate') {
            return caches.match('/index.html');
        }

        throw error;
    }
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
    const staticExtensions = [
        '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.webp',
        '.woff', '.woff2', '.ttf', '.eot',
        '.mp3', '.wav', '.ogg',
        '.json'
    ];

    return staticExtensions.some(ext => pathname.endsWith(ext)) ||
        pathname.startsWith('/assets/');
}

// Handle messages from the app
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
        });
    }
});

console.log('[SW] Service Worker loaded');
