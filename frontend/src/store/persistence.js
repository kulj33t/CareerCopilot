// Minimal localStorage persistence. Saves a whitelisted subset of state on
// every change (debounced) and loads it back at store-init time.

const STORAGE_KEY = 'careercopilot:state:v1';
const SAVE_DEBOUNCE_MS = 300;

// After Phase 8 almost everything is server-backed. The only thing we still
// persist locally is the draft JD text in the textarea — a UX nicety so the
// user doesn't lose what they pasted on accidental refresh. Everything else
// comes from the API.
const PERSISTED_KEYS = ['jd'];

export function loadPreloadedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    const filtered = {};
    for (const k of PERSISTED_KEYS) {
      if (parsed[k]) filtered[k] = parsed[k];
    }
    return Object.keys(filtered).length ? filtered : undefined;
  } catch {
    return undefined;
  }
}

export function attachPersistence(store) {
  let timer = null;
  store.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const state = store.getState();
        const toSave = {};
        for (const k of PERSISTED_KEYS) toSave[k] = state[k];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {
        // quota exceeded / private mode — drop silently
      }
    }, SAVE_DEBOUNCE_MS);
  });
}
