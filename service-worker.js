// Cache Version - भविष्यमा अपडेट गर्दा यो नाम मात्र परिवर्तन गर्ने (जस्तै: v1.4.1)
const CACHE_NAME = 'aryal-family-tree-v1.4.0';

// अफलाइनको लागि सुरक्षित राख्नुपर्ने मुख्य फाइलहरू
const URLS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './disclaimer.html',
    './404.html',
    './logo/favicon.ico',
    './logo/favicon-16x16.png',
    './logo/favicon-32x32.png',
    './logo/apple-touch-icon.png',
    './logo/android-chrome-192x192.png',
    './logo/android-chrome-512x512.png',
    'https://d3js.org/d3.v7.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// 1. Install Event (फाइलहरूलाई Cache मा सेभ गर्ने)
self.addEventListener('install', event => {
    self.skipWaiting(); // नयाँ सर्भिस वर्करलाई तुरुन्तै सक्रिय गराउने
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching files');
                return cache.addAll(URLS_TO_CACHE);
            })
            .catch(err => console.error('Cache caching failed:', err))
    );
});

// 2. Activate Event (पुरानो Cache हटाएर नयाँ मात्र राख्ने)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // यदि पुरानो क्यास हो भने त्यसलाई सधैंको लागि मेटाउने
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // सबै ट्याबहरूमा तुरुन्तै नयाँ भर्सन लागू गर्ने
    );
});

// 3. Fetch Event (नेटवर्क छ भने नेटवर्कबाट तान्ने, नभए Cache बाट देखाउने - Network First Strategy)
self.addEventListener('fetch', event => {
    // Supabase API कलहरूलाई Cache नगर्ने (सधैं लाइभ हुनुपर्छ)
    if (event.request.url.includes('supabase.co')) {
        return; 
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // नेटवर्क चलिरहेको छ भने नयाँ फाइल ल्याउने र क्यास अपडेट गर्ने
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                return response;
            })
            .catch(() => {
                // इन्टरनेट नभएको बेला (Offline) Cache बाट फाइल देखाउने
                return caches.match(event.request).then(response => {
                    if (response) {
                        return response;
                    }
                    // यदि खोजेको पेज क्यासमा पनि छैन भने 404 पेज देखाउने
                    if (event.request.mode === 'navigate') {
                        return caches.match('./404.html');
                    }
                });
            })
    );
});