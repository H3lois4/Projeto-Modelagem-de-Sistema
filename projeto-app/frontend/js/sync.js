/**
 * sync.js — Synchronization logic for offline-first data.
 *
 * Polls the server every 30 seconds via GET /api/ping.
 * When the server is reachable, sends pending items from IndexedDB
 * in chronological order (created_at ascending) via POST /api/sync.
 * Marks items as synced after successful submission.
 * Manages server base URL via localStorage ('server_url').
 * Updates the connectivity indicator (#connectivity-indicator).
 *
 * Exposed as window.Sync
 *
 * Requirements: 12.1, 12.2, 12.3, 17.1
 */
const Sync = (() => {
  'use strict';

  var POLL_INTERVAL = 30000; // 30 seconds
  var STORES = ['pending_forms', 'pending_posts', 'pending_receipts'];
  var LS_KEY = 'server_url';

  var _intervalId = null;

  // ─── Server URL management ───

  /**
   * Return the configured base URL for the server.
   * If the app is served from the same origin as the API (e.g. Flask on Render),
   * returns '' so requests go to the same origin (most reliable).
   * @returns {string}
   */
  function getServerUrl() {
    var stored = localStorage.getItem(LS_KEY);
    if (stored) return stored;
    return window.API_BASE_URL || '';
  }

  /**
   * Configure the base URL for the server.
   * @param {string} url
   */
  function setServerUrl(url) {
    localStorage.setItem(LS_KEY, url || '');
  }

  // ─── Connectivity indicator ───

  /**
   * Update the visual connectivity indicator.
   * @param {'online'|'pending'|'offline'} status
   */
  function _updateIndicator(status) {
    var el = document.getElementById('connectivity-indicator');
    if (!el) return;

    el.classList.remove('online', 'pending', 'offline');
    el.classList.add(status);

    var label = el.querySelector('.connectivity-label');
    if (label) {
      var labels = { online: 'Online', pending: 'Pendente', offline: 'Offline' };
      label.textContent = labels[status] || 'Offline';
    }
  }

  // ─── Ping ───

  /**
   * Check connectivity by hitting GET /api/ping.
   * Uses AbortController to timeout after 10 seconds.
   * @returns {Promise<boolean>} true if server is reachable
   */
  function ping() {
    // Quick check — browser says we're offline
    if (typeof navigator.onLine !== 'undefined' && !navigator.onLine) {
      return Promise.resolve(false);
    }

    var base = getServerUrl();
    var url = base + '/api/ping';

    // Timeout after 10s (Render free tier can be slow to wake)
    var controller;
    var signal;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      signal = controller.signal;
      setTimeout(function () { controller.abort(); }, 10000);
    }

    return fetch(url, { method: 'GET', signal: signal })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  // ─── Sync all pending items ───

  /**
   * Gather all pending items from the 3 stores, sort by created_at,
   * send as a batch via POST /api/sync, then mark synced in IndexedDB.
   * @returns {Promise<{synced: string[], errors: Array}>}
   */
  function syncAll() {
    var base = getServerUrl();

    // 1. Collect pending items from all stores
    return Promise.all(
      STORES.map(function (store) {
        return window.DB.getPending(store).then(function (items) {
          return items.map(function (item) {
            item._store = store;
            return item;
          });
        });
      })
    )
    .then(function (arrays) {
      // 2. Flatten and sort by created_at ascending
      var all = [];
      arrays.forEach(function (arr) {
        all = all.concat(arr);
      });
      all.sort(function (a, b) {
        return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
      });

      if (all.length === 0) {
        return { synced: [], errors: [] };
      }

      // 3. Build batch payload
      var payload = all.map(function (item) {
        return {
          id: item.id,
          type: item.type,
          data: item.data,
          created_at: item.created_at
        };
      });

      // 4. Send via POST /api/sync
      return fetch(base + '/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload })
      })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Sync request failed: ' + res.status);
        }
        return res.json();
      })
      .then(function (result) {
        // 5. Mark synced items in IndexedDB
        var syncedIds = result.synced || [];
        var errorIds = (result.errors || []).map(function (e) { return e.id; });
        // Mark both synced and errored items to avoid retrying forever
        var doneIds = syncedIds.concat(errorIds);
        var promises = [];

        all.forEach(function (item) {
          if (doneIds.indexOf(item.id) !== -1) {
            promises.push(
              window.DB.markSynced(item._store, item.id)
            );
          }
        });

        return Promise.all(promises).then(function () {
          // 6. Clear synced items from each store
          return Promise.all(
            STORES.map(function (store) {
              return window.DB.clearSynced(store);
            })
          );
        }).then(function () {
          return { synced: result.synced || [], errors: result.errors || [] };
        });
      });
    });
  }

  // ─── Polling cycle ───

  /**
   * Single poll cycle: ping → sync if reachable → update indicator.
   */
  function _poll() {
    ping().then(function (reachable) {
      if (!reachable) {
        _updateIndicator('offline');
        return;
      }

      // Server is reachable — check for pending items
      var pendingChecks = STORES.map(function (store) {
        return window.DB.getPending(store).catch(function () { return []; });
      });

      return Promise.all(pendingChecks).then(function (arrays) {
        var totalPending = 0;
        arrays.forEach(function (arr) { totalPending += arr.length; });

        if (totalPending === 0) {
          _updateIndicator('online');
          return;
        }

        // There are pending items — sync them
        _updateIndicator('pending');
        return syncAll().then(function () {
          _updateIndicator('online');
        }).catch(function () {
          _updateIndicator('online');
        });
      }).catch(function () {
        // DB error but server is reachable
        _updateIndicator('online');
      });
    }).catch(function () {
      _updateIndicator('offline');
    });
  }

  // ─── Start / Stop ───

  /**
   * Start polling every 30 seconds. Runs an immediate poll first.
   */
  function start() {
    if (_intervalId) return; // already running
    _poll(); // immediate first check
    _intervalId = setInterval(_poll, POLL_INTERVAL);
  }

  /**
   * Stop polling.
   */
  function stop() {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  }

  return {
    start: start,
    stop: stop,
    ping: ping,
    syncAll: syncAll,
    getServerUrl: getServerUrl,
    setServerUrl: setServerUrl
  };
})();

window.Sync = Sync;
