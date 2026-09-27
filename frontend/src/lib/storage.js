// localStorage for per-viewer conveniences (remembered choices). Access can
// throw when site data is blocked, and a convenience must never take a page
// down, so every call is guarded and failure just means "not remembered".

export function readSetting(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeSetting(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* not remembered; nothing else depends on it */
  }
}
