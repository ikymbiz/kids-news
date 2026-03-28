const CACHE_NAME = 'kids-news-app-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './podcasts.json'
  // アイコン画像を用意したらここに追加します
  // './icon-192.png',
  // './icon-512.png'
];

// 1. インストール時に必要なファイルをキャッシュする
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. オフライン時でもキャッシュからファイルを返す
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返し、なければネットワークへリクエスト
        return response || fetch(event.request);
      })
  );
});

// 3. 古いバージョンのキャッシュを削除する
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
