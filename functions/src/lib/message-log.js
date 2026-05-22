// In-memory ring buffer — survives across warm invocations of the same container.
// Resets on cold starts, which is acceptable for a dev monitoring tool.
const MAX = 200;
const log = [];

function push(topic, payload) {
  if (log.length >= MAX) log.shift();
  log.push({
    id: Date.now() + Math.random().toString(36).slice(2, 6),
    topic,
    payload,
    ts: new Date().toISOString(),
  });
}

function getRecent(limit = 50) {
  return log.slice(-Math.min(limit, MAX)).reverse();
}

function clear() {
  log.length = 0;
}

module.exports = { push, getRecent, clear };
