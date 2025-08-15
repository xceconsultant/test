// Replace with your bucket + region website endpoint:
const ORIGIN = 'http://cdn.bzzo.in.s3-website.ap-south-1.amazonaws.com';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only proxy same-origin navigations & asset requests
  if (url.origin !== self.location.origin) return;

  // Map GitHub Pages URL -> S3 website object key
  let path = url.pathname;
  if (path.endsWith('/')) path += 'index.html';
  if (path === '/') path = '/index.html';

  const target = ORIGIN + path + url.search;

  event.respondWith((async () => {
    // GET/HEAD only; pass through others
    if (!['GET','HEAD'].includes(event.request.method)) {
      return fetch(event.request);
    }

    // Fetch from S3; relies on S3 CORS allowing your domain
    const resp = await fetch(target, { redirect: 'follow' });

    // Simple SPA-style 404 fallback
    if (resp.status === 404) {
      const nf = await fetch(ORIGIN + '/404.html');
      if (nf.ok) return new Response(nf.body, { status: 404, headers: nf.headers });
    }

    // Tweak caching: short for HTML, long for assets
    const h = new Headers(resp.headers);
    const ct = h.get('content-type') || '';
    if (ct.includes('text/html')) {
      h.set('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (!h.has('Cache-Control')) {
      h.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    return new Response(resp.body, { status: resp.status, headers: h });
  })());
});
