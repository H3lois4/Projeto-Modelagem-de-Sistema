/**
 * db.js — IndexedDB helper for offline-first persistence.
 *
 * Stores: pending_forms, pending_posts, pending_receipts
 * Each record: { id, type, data, created_at, synced }
 *
 * Exposed as window.DB
 */
const DB = (() => {
  const DB_NAME = 'ariri_db';
  const DB_VERSION = 1;
  const STORES = ['pending_forms', 'pending_posts', 'pending_receipts'];

  let _db = null;

  /**
   * Open (or create) the IndexedDB database.
   * Creates the three object stores on first run.
   * @returns {Promise<IDBDatabase>}
   */
  function init() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = (event) => {
        _db = event.target.result;
        resolve(_db);
      };

      request.onerror = (event) => {
        reject(new Error('IndexedDB init failed: ' + event.target.error));
      };
    });
  }

  /**
   * Add a pending item to the given store.
   * Generates id and created_at if not provided. Sets synced = false.
   * @param {string} store - One of STORES
   * @param {object} item  - Must include at least { type, data }
   * @returns {Promise<string>} The id of the inserted record
   */
  function addPending(store, item) {
    return init().then((db) => {
      return new Promise((resolve, reject) => {
        const record = {
          id: item.id || crypto.randomUUID(),
          type: item.type,
          data: item.data,
          created_at: item.created_at || new Date().toISOString(),
          synced: false,
        };

        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        const req = os.add(record);

        req.onsuccess = () => resolve(record.id);
        req.onerror = (e) => reject(new Error('addPending failed: ' + e.target.error));
      });
    });
  }

  /**
   * Get all pending (synced === false) records from a store,
   * ordered by created_at ascending.
   * @param {string} store
   * @returns {Promise<Array>}
   */
  function getPending(store) {
    return init().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const os = tx.objectStore(store);
        const req = os.getAll();

        req.onsuccess = () => {
          const pending = req.result
            .filter((r) => r.synced === false)
            .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
          resolve(pending);
        };
        req.onerror = (e) => reject(new Error('getPending failed: ' + e.target.error));
      });
    });
  }

  /**
   * Mark a single record as synced (synced = true).
   * @param {string} store
   * @param {string} id
   * @returns {Promise<void>}
   */
  function markSynced(store, id) {
    return init().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        const getReq = os.get(id);

        getReq.onsuccess = () => {
          const record = getReq.result;
          if (!record) {
            reject(new Error('Record not found: ' + id));
            return;
          }
          record.synced = true;
          const putReq = os.put(record);
          putReq.onsuccess = () => resolve();
          putReq.onerror = (e) => reject(new Error('markSynced failed: ' + e.target.error));
        };
        getReq.onerror = (e) => reject(new Error('markSynced get failed: ' + e.target.error));
      });
    });
  }

  /**
   * Delete all records where synced === true from a store.
   * @param {string} store
   * @returns {Promise<void>}
   */
  function clearSynced(store) {
    return init().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        const req = os.getAll();

        req.onsuccess = () => {
          const synced = req.result.filter((r) => r.synced === true);
          synced.forEach((r) => os.delete(r.id));
          tx.oncomplete = () => resolve();
          tx.onerror = (e) => reject(new Error('clearSynced failed: ' + e.target.error));
        };
        req.onerror = (e) => reject(new Error('clearSynced getAll failed: ' + e.target.error));
      });
    });
  }

  return { init, addPending, getPending, markSynced, clearSynced };
})();

window.DB = DB;
