import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API is vendor-prefixed in Chromium-based browsers. Safari also
// ships it under the webkit prefix. Firefox currently (early 2026) needs a
// flag flipped, so those users fall through to the text-mode fallback.
const SR =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// Preferred voices, in priority order. Modern browsers ship Neural/Natural
// voices under these names — they sound dramatically better than the default.
const PREFERRED_VOICES = [
  // Microsoft Edge neural voices (Windows/macOS with Edge or recent Chrome)
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Guy Online (Natural) - English (United States)',
  'Microsoft Libby Online (Natural) - English (United Kingdom)',
  // Google voices (Chromium)
  'Google US English',
  'Google UK English Female',
  'Google UK English Male',
  // macOS / iOS premium voices
  'Samantha',
  'Karen',
  'Daniel',
];

// Chromium silently cuts off utterances longer than ~15 seconds. Split the
// text into sentence-sized chunks and queue them; each chunk stays well
// under the limit.
const MAX_CHUNK_CHARS = 220;

export function isVoiceSupported() {
  return Boolean(SR && typeof window !== 'undefined' && 'speechSynthesis' in window);
}

function pickVoice(voices) {
  if (!voices || voices.length === 0) return null;
  for (const name of PREFERRED_VOICES) {
    const m = voices.find((v) => v.name === name);
    if (m) return m;
  }
  const neural = voices.find(
    (v) => /natural|neural|premium|enhanced/i.test(v.name) && v.lang.startsWith('en')
  );
  if (neural) return neural;
  const enUs = voices.find((v) => v.lang === 'en-US');
  if (enUs) return enUs;
  const en = voices.find((v) => v.lang.startsWith('en'));
  return en || voices[0];
}

// Splits long text into TTS-safe chunks. Tries to break on sentence boundaries
// (.?!), then on commas, then on hard character limits — never mid-word.
function chunkForTts(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= MAX_CHUNK_CHARS) return [clean];

  const sentenceRe = /[^.!?]+[.!?]+\s*|[^.!?]+$/g;
  const sentences = clean.match(sentenceRe) || [clean];
  const chunks = [];
  let buffer = '';
  for (const s of sentences) {
    const sentence = s.trim();
    if (!sentence) continue;
    if (sentence.length > MAX_CHUNK_CHARS) {
      // Split long sentence further on commas, then words.
      if (buffer) {
        chunks.push(buffer.trim());
        buffer = '';
      }
      const bits = sentence.split(/,\s*/);
      let sub = '';
      for (const b of bits) {
        if ((sub + ', ' + b).length > MAX_CHUNK_CHARS) {
          if (sub) chunks.push(sub.trim());
          sub = b;
        } else {
          sub = sub ? `${sub}, ${b}` : b;
        }
      }
      if (sub) chunks.push(sub.trim());
      continue;
    }
    if ((buffer + ' ' + sentence).length > MAX_CHUNK_CHARS) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
    }
  }
  if (buffer) chunks.push(buffer.trim());
  return chunks.filter(Boolean);
}

/**
 * Real-time voice mode for the mock interview.
 *
 * Public API:
 *   - supported, selectedVoice, voicesReady
 *   - listening, speaking, interim, error
 *   - start(), stop(), cancel()
 *   - speak(text, { onEnd }), cancelSpeaking()
 *   - prime() — call inside a user gesture to unlock autoplay policy
 *
 * silenceThresholdMs: when > 0, any pause of that length during active
 * listening auto-commits the running transcript and stops listening. The
 * parent is expected to restart via start() after the AI finishes speaking.
 */
export function useVoiceMode({
  onTranscript,
  muted = false,
  lang = 'en-US',
  silenceThresholdMs = 0,
} = {}) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voicesReady, setVoicesReady] = useState(false);

  const recognitionRef = useRef(null);
  const finalRef = useRef('');
  const silenceTimerRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // Voices load asynchronously. Also wait up to 1s for them — if we speak
  // before they arrive, the default robotic voice gets used.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    let resolved = false;
    const refresh = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      setSelectedVoice(pickVoice(voices));
      setVoicesReady(true);
      resolved = true;
    };
    refresh();
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    const timeout = setTimeout(() => {
      if (!resolved) setVoicesReady(true); // give up waiting, use default
    }, 1200);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!SR) return undefined;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    const handleSilenceFired = () => {
      const text = (finalRef.current + (rec._lastInterim || '')).trim();
      if (!text) return;
      finalRef.current = '';
      rec._lastInterim = '';
      setInterim('');
      try { rec.stop(); } catch { /* noop */ }
      if (onTranscriptRef.current) onTranscriptRef.current(text);
    };

    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += chunk + ' ';
        else interimText += chunk;
      }
      rec._lastInterim = interimText;
      setInterim(interimText);
      if (silenceThresholdMs > 0) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(handleSilenceFired, silenceThresholdMs);
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(e.error || 'Speech recognition error');
      setListening(false);
    };
    rec.onend = () => {
      clearTimeout(silenceTimerRef.current);
      setListening(false);
    };
    recognitionRef.current = rec;
    return () => {
      clearTimeout(silenceTimerRef.current);
      try { rec.abort(); } catch { /* noop */ }
    };
  }, [lang, silenceThresholdMs]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setError(null);
    finalRef.current = '';
    recognitionRef.current._lastInterim = '';
    setInterim('');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      if (!String(err.message).includes('already started')) {
        setError(err.message || 'Could not start listening');
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current.stop(); } catch { /* noop */ }
    const finalText = (finalRef.current + (recognitionRef.current._lastInterim || '')).trim();
    finalRef.current = '';
    recognitionRef.current._lastInterim = '';
    setInterim('');
    setListening(false);
    if (finalText && onTranscriptRef.current) onTranscriptRef.current(finalText);
  }, []);

  const cancel = useCallback(() => {
    if (!recognitionRef.current) return;
    clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current.abort(); } catch { /* noop */ }
    finalRef.current = '';
    recognitionRef.current._lastInterim = '';
    setInterim('');
    setListening(false);
  }, []);

  // Primer — call inside a user gesture (e.g. a click handler) to unlock
  // Chromium's autoplay policy for the remainder of the session.
  const prime = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch { /* noop */ }
  }, []);

  // Tracks the active TTS queue so we can cancel cleanly and fire a single
  // onEnd after the LAST chunk finishes.
  const utterQueueRef = useRef({ cancelled: false });

  const speak = useCallback(
    (text, opts = {}) => {
      if (muted || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        opts.onEnd?.();
        return;
      }
      const clean = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!clean) {
        opts.onEnd?.();
        return;
      }

      // Cancel any previous queue/utterance and mark it as stopped.
      window.speechSynthesis.cancel();
      if (utterQueueRef.current) utterQueueRef.current.cancelled = true;
      const queue = { cancelled: false };
      utterQueueRef.current = queue;

      const chunks = chunkForTts(clean);
      if (chunks.length === 0) {
        opts.onEnd?.();
        return;
      }

      let i = 0;
      setSpeaking(true);

      const speakNext = () => {
        if (queue.cancelled) return;
        if (i >= chunks.length) {
          setSpeaking(false);
          opts.onEnd?.();
          return;
        }
        const u = new SpeechSynthesisUtterance(chunks[i]);
        if (selectedVoice) u.voice = selectedVoice;
        u.rate = opts.rate ?? 1.0;
        u.pitch = opts.pitch ?? 1.0;
        u.lang = lang;
        // Belt-and-braces timer: Chrome occasionally fails to fire onend
        // especially for short utterances. The timer forces progress so the
        // conversation doesn't deadlock. Estimate: ~12 chars/sec of speech.
        const fallbackMs = Math.max(1500, (chunks[i].length / 12) * 1000 + 400);
        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          i += 1;
          speakNext();
        };
        u.onend = settle;
        u.onerror = settle;
        const timer = setTimeout(settle, fallbackMs);
        try { window.speechSynthesis.speak(u); } catch { settle(); }
      };
      speakNext();
    },
    [muted, lang, selectedVoice]
  );

  const cancelSpeaking = useCallback(() => {
    if (utterQueueRef.current) utterQueueRef.current.cancelled = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  return {
    supported: isVoiceSupported(),
    selectedVoice,
    voicesReady,
    listening,
    speaking,
    interim,
    error,
    start,
    stop,
    cancel,
    speak,
    cancelSpeaking,
    prime,
  };
}
