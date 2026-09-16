self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const orderId = event.notification.data?.orderId;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clients.find((client) => client.url.includes("/admin"));
    if (existing) { await existing.focus(); existing.postMessage({ type: "siren-open-order", orderId }); return; }
    await self.clients.openWindow("/admin");
  })());
});
