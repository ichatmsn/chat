const CACHE_NAME = 'facba-chat-v2';
const URLS_TO_CACHE = [
  './prueba.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://www.gstatic.com/firebasejs/9.1.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.1.1/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.1.1/firebase-analytics-compat.js'
];

// Generar icono PNG dinámicamente con OffscreenCanvas
async function generateIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fondo azul con esquinas redondeadas
  const r = size * 0.18;
  ctx.fillStyle = '#007aff';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.arcTo(size, 0, size, r, r);
  ctx.lineTo(size, size - r);
  ctx.arcTo(size, size, size - r, size, r);
  ctx.lineTo(r, size);
  ctx.arcTo(0, size, 0, size - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fill();

  // Dibujar burbuja de chat blanca
  const cx = size * 0.5, cy = size * 0.42;
  const bw = size * 0.5, bh = size * 0.34;
  const br = size * 0.08;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(cx - bw/2 + br, cy - bh/2);
  ctx.lineTo(cx + bw/2 - br, cy - bh/2);
  ctx.arcTo(cx + bw/2, cy - bh/2, cx + bw/2, cy - bh/2 + br, br);
  ctx.lineTo(cx + bw/2, cy + bh/2 - br);
  ctx.arcTo(cx + bw/2, cy + bh/2, cx + bw/2 - br, cy + bh/2, br);
  ctx.lineTo(cx - bw/2 + br, cy + bh/2);
  ctx.arcTo(cx - bw/2, cy + bh/2, cx - bw/2, cy + bh/2 - br, br);
  ctx.lineTo(cx - bw/2, cy - bh/2 + br);
  ctx.arcTo(cx - bw/2, cy - bh/2, cx - bw/2 + br, cy - bh/2, br);
  ctx.closePath();
  // Cola de la burbuja
  ctx.moveTo(cx - size*0.06, cy + bh/2);
  ctx.lineTo(cx - size*0.12, cy + bh/2 + size*0.1);
  ctx.lineTo(cx + size*0.06, cy + bh/2);
  ctx.fill();

  // Texto "FC" dentro de la burbuja
  ctx.fillStyle = '#007aff';
  ctx.font = `bold ${size * 0.18}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FC', cx, cy);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Response(blob, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' }
  });
}

// Instalar: cachear archivos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Al tocar una notificación, abrir/enfocar la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes('prueba.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow('./prueba.html');
      }
    })
  );
});

// Fetch: interceptar iconos + network first con fallback a cache
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Interceptar requests de iconos PWA y generarlos dinámicamente
  if (url.includes('icon-192.png') || url.includes('icon-512.png')) {
    const size = url.includes('192') ? 192 : 512;
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return generateIcon(size).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
