self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  if (event.action === "engineOff" || event.action === "tripEnded") {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientsArr => {
        if (clientsArr.length > 0) {
          clientsArr[0].postMessage(event.action);
        }
      })
    );
  }
});
