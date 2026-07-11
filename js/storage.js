/**
 * storage.js
 * ------------------------------------------------------------
 * Thin wrapper around localStorage so the rest of the app never
 * touches `window.localStorage` directly. Makes it trivial to
 * swap the persistence layer later (e.g. IndexedDB) without
 * rewriting calculator/ui logic.
 * ------------------------------------------------------------
 */

const STORAGE_KEYS = {
  SUBJECTS: 'gpaStudio.currentSubjects',
  SEMESTERS: 'gpaStudio.semesters',
  SIMULATOR: 'gpaStudio.simulator',
  THEME: 'gpaStudio.theme'
};

const Storage = {
  /**
   * Reads and JSON-parses a key. Returns fallback on any failure
   * (missing key, corrupted JSON, storage disabled, etc.)
   */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.error(`Storage.get failed for key "${key}":`, err);
      return fallback;
    }
  },

  /**
   * JSON-stringifies and writes a value. Returns true/false so
   * callers can show a toast if persistence silently failed
   * (e.g. private browsing mode with storage disabled).
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`Storage.set failed for key "${key}":`, err);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`Storage.remove failed for key "${key}":`, err);
      return false;
    }
  },

  /** Removes every key this app owns (used by "Clear all data"). */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach((key) => this.remove(key));
  }
};
