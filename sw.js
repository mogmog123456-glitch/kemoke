const CACHE_NAME = 'kemoket-v1';
const ASSETS = [
  './',
  './index.html'
];

// インストール時にキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// オフラインファースト: キャッシュ優先、なければネットワーク
self.addEventListener('fetch', event => {
  // API呼び出し（AI機能）はネットワーク優先
  if (event.request.url.includes('api.anthropic.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: { message: 'オフラインです' } }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // それ以外はキャッシュ優先
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 成功したレスポンスをキャッシュに追加
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // オフラインでキャッシュもない場合
        return new Response('オフラインです', { status: 503 });
      });
    })
  );
});
