const WebSocket = require('ws');

let wss = null;
const clients = new Set();

const initNotificationHub = (server) => {
  try {
    wss = new WebSocket.Server({ server, path: '/ws/notifications' });

    wss.on('connection', (ws, req) => {
      ws._meta = { role: null };
      clients.add(ws);

      ws.on('message', (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data && data.role) {
            ws._meta.role = data.role;
          }
        } catch (err) {
          // ignore non-json
        }
      });

      ws.on('close', () => clients.delete(ws));
      ws.on('error', () => clients.delete(ws));
    });

    console.log('[NotificationHub] WebSocket notifications available at /ws/notifications');
  } catch (err) {
    console.error('[NotificationHub] Failed to start WebSocket server:', err.message || err);
  }
};

const broadcastNotification = (notification) => {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'notification', data: notification });
  for (const ws of clients) {
    try {
      if (ws.readyState === WebSocket.OPEN && ws._meta && ws._meta.role === 'admin') {
        ws.send(payload);
      }
    } catch (err) {
      // swallow per-client errors
    }
  }
};

module.exports = {
  initNotificationHub,
  broadcastNotification
};
