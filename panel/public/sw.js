// Service worker mínimo: permite instalar el panel como app. No guarda datos en caché
// (siempre muestra información actualizada); sin conexión muestra un aviso simple.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<body style="font-family:system-ui;padding:2rem;text-align:center"><h2>Sin conexión</h2>' +
            '<p>Revisa tu internet e intenta de nuevo.</p></body>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        ),
    ),
  );
});
