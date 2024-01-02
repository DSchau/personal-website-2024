/*
 * Silly past me, using offline-plugin https://www.npmjs.com/package/offline-plugin
 * This replaces sw.js for any old clients still navigating dustinschau.com
 * I will probably need to keep this file... forever?
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.registration
    .unregister()
    .then(() => self.clients.matchAll())
    .then((clients) => {
      clients.forEach((client) => {
        if (client.url && "navigate" in client) {
          client.navigate(client.url);
        }
      });
    });
});
