const CACHE = 'duse-v3';
const STATIC = [
  '/',
  '/index.html',
  '/app.html',
  '/privacy.html',
  '/manifest.json',
  '/assets/logo.png'
];

/* ── Install & cache static shell ── */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

/* ── Activate: temizle eski cache ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch: stale-while-revalidate ── */
self.addEventListener('fetch', e => {
  // Sadece GET, aynı origin
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.status === 200) cache.put(e.request, res.clone());
        return res;
      }).catch(() => cached); // offline → cache'den sun
      // Varsa önce cache'i göster, arka planda güncelle
      return cached || fetchPromise;
    })
  );
});

/* ── Periodic Background Sync ── */
self.addEventListener('periodicsync', e => {
  if (e.tag === 'duse-refresh') {
    e.waitUntil(
      caches.open(CACHE).then(cache =>
        Promise.all(
          STATIC.map(url =>
            fetch(url).then(res => {
              if (res && res.status === 200) cache.put(url, res);
            }).catch(() => {})
          )
        )
      )
    );
  }
});

/* ── Background Sync ── */
self.addEventListener('sync', e => {
  if (e.tag === 'duse-sync') {
    e.waitUntil(Promise.resolve());
  }
});

/* ── Notification scheduling ── */
const scheduled = new Map(); // tag → timeoutId

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_NOTIF') {
    const { tag, title, body, delayMs, icon } = e.data;

    if (scheduled.has(tag)) {
      clearTimeout(scheduled.get(tag));
      scheduled.delete(tag);
    }

    if (delayMs <= 0) return;

    const id = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon:    icon || '/assets/logo.png',
        badge:   '/assets/logo.png',
        tag,
        renotify: true,
        vibrate: [180, 80, 180],
        silent:  false,
        data:    { url: '/app.html' }
      });
      scheduled.delete(tag);
    }, delayMs);

    scheduled.set(tag, id);
  }

  if (e.data.type === 'CANCEL_NOTIF') {
    const { tag } = e.data;
    if (scheduled.has(tag)) {
      clearTimeout(scheduled.get(tag));
      scheduled.delete(tag);
    }
  }
});

/* ── Notification click → open app ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/app.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('app.html') && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
