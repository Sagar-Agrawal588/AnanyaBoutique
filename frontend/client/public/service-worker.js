/* Clears old storefront service workers that may have been registered before Firebase App Hosting. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (self.caches) {
        const cacheNames = await self.caches.keys();
        await Promise.all(cacheNames.map((cacheName) => self.caches.delete(cacheName)));
      }

      await self.registration.unregister();

      const windows = await self.clients.matchAll({ type: "window" });
      await Promise.all(
        windows.map((client) => {
          if ("navigate" in client) {
            return client.navigate(client.url);
          }
          return undefined;
        }),
      );
    })(),
  );
});
