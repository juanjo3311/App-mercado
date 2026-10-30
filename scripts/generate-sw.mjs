// Genera dist/sw.js después de `expo export -p web`.
// Precarga todos los recursos estáticos para que la app abra sin internet.
import { generateSW } from 'workbox-build';

const { count, size, warnings } = await generateSW({
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,png,jpg,svg,ico,ttf,otf,woff,woff2,json,webmanifest}'],
  // Las fuentes de íconos viven en dist/assets/node_modules; no se deben ignorar.
  globIgnores: [
    'sw.js',
    'workbox-*.js',
    'metadata.json',
    // La app solo usa Ionicons; las demás fuentes de @expo/vector-icons no se precargan.
    '**/vector-icons/**/Fonts/!(Ionicons.*).ttf',
  ],
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
  // Las rutas de la app (/mercado, /receta/123…) abren el index.html precargado.
  navigateFallback: '/index.html',
  // Los nombres de los bundles de Expo ya incluyen un hash, no hace falta revisarlos.
  dontCacheBustURLsMatching: /\/_expo\/static\/|\/assets\/.*\.[0-9a-f]{32}\./,
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  sourcemap: false,
  runtimeCaching: [
    {
      // Cualquier otra fuente o imagen que se pida después queda guardada para usarse sin internet.
      urlPattern: ({ request, sameOrigin }) => sameOrigin && (request.destination === 'font' || request.destination === 'image'),
      handler: 'CacheFirst',
      options: { cacheName: 'recursos-estaticos', expiration: { maxEntries: 60 } },
    },
  ],
});

for (const w of warnings) console.warn('⚠️ ', w);
console.log(`Service Worker generado: dist/sw.js (${count} archivos, ${(size / 1024 / 1024).toFixed(2)} MB precargados)`);
