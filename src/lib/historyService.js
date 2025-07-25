// Local image upload history service for easy future migration to server storage

const HISTORY_KEY = 'wasteai_upload_history';
const HISTORY_LIMIT = 5;

// Compute SHA-256 hash of a File/Blob, returns hex string
export async function hashFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Save an upload entry: { hash, imageUrl, geminiResult, timestamp }
export function saveUploadToHistory({ hash, imageUrl, geminiResult, timestamp }) {
  let history = getHistory();
  // Remove any existing entry with the same hash
  history = history.filter(entry => entry.hash !== hash);
  // Add new entry to the front (most recently used)
  history.unshift({ hash, imageUrl, geminiResult, timestamp });
  // Enforce LRU limit: remove oldest if over limit
  if (history.length > HISTORY_LIMIT) {
    history = history.slice(0, HISTORY_LIMIT);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// Get all uploads, sorted by timestamp (newest first)
export function getHistory() {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Get cached result by hash, or null if not found. If found, move to front (LRU update)
export function getResultByHash(hash) {
  let history = getHistory();
  const idx = history.findIndex(entry => entry.hash === hash);
  if (idx === -1) return null;
  // Move accessed entry to front (most recently used)
  const [entry] = history.splice(idx, 1);
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return entry;
}

// Clear all upload history
export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
} 