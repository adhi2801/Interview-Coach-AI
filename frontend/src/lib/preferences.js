// Account preferences (stored on the server) that change how the app
// behaves, read wherever they apply. Fetched once per signed-in account and
// shared; Settings updates the cache so changes apply without a reload.

import { useEffect, useState } from "react";
import api, { getToken } from "./api";
import { readSetting, writeSetting } from "./storage";

export const PREFERENCE_DEFAULTS = {
  live_coaching_telemetry: true, // show live confidence/pace/filler meters while answering
  high_contrast_editor: false,   // Monaco's high-contrast theme in the coding room
};

let cache = null;
let cacheToken = null;
let inflight = null;
const listeners = new Set();

function publish(next) {
  cache = next;
  listeners.forEach((fn) => fn(next));
}

export function loadPreferences() {
  const token = getToken();
  if (cache && cacheToken === token) return Promise.resolve(cache);
  if (inflight && cacheToken === token) return inflight;
  cacheToken = token;
  inflight = (token ? api.get("/user/profile-summary") : Promise.reject(new Error("signed out")))
    .then((res) => ({ ...PREFERENCE_DEFAULTS, ...(res.data?.preferences || {}) }))
    .catch(() => ({ ...PREFERENCE_DEFAULTS }))
    .then((prefs) => { inflight = null; publish(prefs); return prefs; });
  return inflight;
}

export function updatePreferenceCache(key, value) {
  publish({ ...(cache || PREFERENCE_DEFAULTS), [key]: value });
}

export function usePreferences() {
  const [prefs, setPrefs] = useState(cache || PREFERENCE_DEFAULTS);
  useEffect(() => {
    listeners.add(setPrefs);
    loadPreferences().then(setPrefs);
    return () => { listeners.delete(setPrefs); };
  }, []);
  return prefs;
}

// The chosen microphone belongs to this device, not the account.
const MIC_KEY = "ic_mic_device";
export const readMicDevice = () => readSetting(MIC_KEY, "");
export const writeMicDevice = (id) => writeSetting(MIC_KEY, id || null);
