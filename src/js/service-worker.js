// Service Worker for Sokoban PWA
const CACHE_NAME = 'sokoban-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './js/main.js',
  './js/game.js',
  './js/level.js',
  './js/player.js',
  './js/boxes.js',
  './js/goal.js',
  './js/events.js',
  './js/resources.js',
  './js/score.js',
  './js/particles.js',
  './js/fx_stars_3d.js',
  './js/config/config.js',
  './styles/main.scss',
  './assets/images/tileset_16x16px.png',
  './assets/images/tileset_32x32px.png',
  './assets/images/tileset_96x96px.png',
  './assets/images/background_levels.png',
  './assets/images/background_levels_wood.png',
  './assets/images/btn_play.png',
  './assets/images/logo.webp',
  './assets/images/main.webp',
  './assets/images/gameplay.webp',
  './assets/images/wood_panel.webp',
  './assets/images/players.png',
  './assets/images/level_score_boxes.png',
  './assets/images/level_score_level.png',
  './assets/images/level_score_moves.png',
  './assets/images/level_score_pushes.png',
  './assets/images/level_score_time.png',
  './assets/images/top_action_home.png',
  './assets/images/top_action_level.png',
  './assets/images/top_action_mute.png',
  './assets/images/top_action_pause.png',
  './assets/images/top_action_restart.png',
  './assets/images/top_action_settings.png',
  './assets/images/top_action_undo.png',
  './assets/level/levels.json',
  './assets/sound/Dreamcatcher.mp3',
  './assets/sound/pushing.mp3',
  './assets/sound/running.mp3',
  './assets/favicon/apple-touch-icon.png',
  './assets/favicon/favicon-96x96.png',
  './assets/favicon/favicon.ico',
  './assets/favicon/favicon.svg',
  './assets/favicon/site.webmanifest',
  './assets/favicon/web-app-manifest-192x192.png',
  './assets/favicon/web-app-manifest-512x512.png'
];

// Dynamically add all level files
for (let i = 1; i <= 37; i++) {
  const levelNum = i.toString().padStart(2, '0');
  urlsToCache.push(`./js/levels/level${levelNum}.json`);
}

// Install event - cache assets
self.addEventListener('install', event => {
  // Use skipWaiting to ensure new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and started adding files');
        // Use Promise.allSettled instead of Promise.all to continue even if some files fail
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(error => {
              console.warn(`Failed to cache: ${url}`, error);
              // Continue despite failure
              return Promise.resolve();
            })
          )
        );
      })
      .then(() => console.log('Caching complete!'))
      .catch(error => console.error('Caching failed:', error))
  );
});

// Fetch event - serve from cache or network with improved handling
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response as it's a stream and can only be consumed once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => console.error('Error caching new resource:', event.request.url, err));

            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            // Return a custom offline page or handle gracefully
            // For now, just propagate the error
            throw error;
          });
      })
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  // Take control of all clients as soon as it activates
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});