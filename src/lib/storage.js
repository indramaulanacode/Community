/**
 * Persistence for the demo store. One key holds the whole snapshot, including
 * `prefs.theme` — the inline script in index.html reads the same key before
 * first paint, so change both together if you rename anything.
 */

export const STORAGE_KEY = 'communities.v1'

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Private mode, disabled storage, or a corrupted write — run in memory.
    return null
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to clear */
  }
}

/** True when persistence is actually working, shown in Settings → Data. */
export function storageAvailable() {
  try {
    const probe = `${STORAGE_KEY}.probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}
