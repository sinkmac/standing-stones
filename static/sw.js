// App-shell service worker.
//
// SHIPS DISABLED. Nothing registers this unless the build sets
// PUBLIC_SW_ENABLED=true, so by default the live property is untouched.
//
//   - version comes from the registering URL: /sw.js?v=<buildId>
//   - caches are keyed to that version; every other cache is deleted on activate
//   - /sw-kill.json uninstalls this worker with NO deploy
//   - precache is the APP SHELL ONLY: never the site's own routes, never the API
//   - skipWaiting is never called except as part of a kill
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'ssv-app-shell-' + VERSION;
const APP_SHELL = ['/app', '/manifest.webmanifest'];
const KILL_URL = '/sw-kill.json';

async function killed() {
  try { return (await fetch(KILL_URL, { cache: 'no-store' })).ok; } catch { return false; }
}

async function uninstall() {
  const keys = await caches.keys();
  await Promise.all(keys.map(function (k) { return caches.delete(k); }));
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(function (c) { if (c.navigate) c.navigate(c.url); });
}

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    if (await killed()) { await uninstall(); return; }
    const c = await caches.open(CACHE);
    await c.addAll(APP_SHELL).catch(function () {});
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    if (await killed()) { await uninstall(); return; }
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  let url;
  try { url = new URL(e.request.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  // ONLY app-shell navigations. The site's own routes and every API route are
  // never intercepted - that is what keeps the existing website correct.
  // Build assets of the app shell: content-hashed and immutable under /_app/,
  // so cache-first is safe for them. Without this, an offline open returns the
  // cached HTML but no CSS or JS - an unstyled shell, not a working screen.
  // These are assets, not routes: the site's pages and every API route are still
  // never intercepted, and this changes nothing for a non-installed visitor.
  if (url.pathname.indexOf('/_app/') === 0) {
    e.respondWith((async function () {
      const c = await caches.open(CACHE);
      const hit = await c.match(e.request);
      if (hit) return hit;
      try {
        const r = await fetch(e.request);
        if (r && r.ok) c.put(e.request, r.clone());
        return r;
      } catch (_) {
        return (await c.match(e.request)) || Response.error();
      }
    })());
    return;
  }

  if (e.request.mode === 'navigate' && url.pathname.indexOf('/app') === 0) {
    e.respondWith((async function () {
      if (await killed()) { await uninstall(); return fetch(e.request); }
      try {
        const r = await fetch(e.request);
        const c = await caches.open(CACHE);
        c.put('/app', r.clone());
        return r;
      } catch (_) {
        const c = await caches.open(CACHE);
        return (await c.match('/app')) || Response.error();
      }
    })());
  }
});

self.addEventListener('message', function (e) {
  if (e.data === 'kill') e.waitUntil(uninstall());
});
