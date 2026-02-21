/**
 * message-log.js
 *
 * In-memory ring buffer of recent MQTT messages (all topics).
 * Used by the /dev/mqtt/messages endpoint so the dashboard can monitor
 * broker traffic without a persistent message store.
 *
 * Max capacity: 200 entries. Oldest entries are evicted when full.
 */

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

/** Return the most recent `limit` entries, newest first. */
function getRecent(limit = 50) {
  return log.slice(-Math.min(limit, MAX)).reverse();
}

function clear() {
  log.length = 0;
}

module.exports = { push, getRecent, clear };
