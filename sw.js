const CACHE = 'duse-v2';
const FILES = [
  '/',
  '/index.html',
  '/app.html',
  '/assets/logo.png'
];

/* ── Install & cache ── */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

/* ── Notification scheduling ── */
const scheduled = new Map(); // tag → timeoutId

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_NOTIF') {
    const { tag, title, body, delayMs, icon } = e.data;

    // Cancel existing timeout for this tag
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
