// The live-coaching WebSocket for one interview session.
//
// Connects with a one-minute ticket (never the login token), reconnects
// with backoff when a deploy or flaky network drops it — fetching a fresh
// ticket each time — and stops retrying on 1008, which means the server
// refused this session outright.

import { useCallback, useEffect, useRef, useState } from "react";
import { coachingSocketUrl } from "../../lib/api";

const MAX_RETRIES = 5;
const PING_MS = 20000;
const INTERVENTION_MS = 6000;

export function useCoachingSocket(sessionId, { onTranscription } = {}) {
  const [connected, setConnected] = useState(false);
  const [coaching, setCoaching] = useState(null);
  const [intervention, setIntervention] = useState(null);
  const wsRef = useRef(null);
  const interventionTimer = useRef(null);
  const onTranscriptionRef = useRef(onTranscription);
  useEffect(() => { onTranscriptionRef.current = onTranscription; });

  useEffect(() => {
    if (!sessionId) return;
    let ws = null;
    let retryTimer = null;
    let attempts = 0;
    let disposed = false;

    function scheduleRetry() {
      if (disposed || attempts >= MAX_RETRIES) return;
      attempts += 1;
      retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempts, 15000));
    }

    async function connect() {
      let url;
      try {
        url = await coachingSocketUrl(sessionId);
      } catch {
        scheduleRetry();
        return;
      }
      if (disposed) return;
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setConnected(true);
      };
      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === "coaching_update") {
          setCoaching(data);
          if (data.intervention) {
            // Replace, never stack: a newer probe restarts the timer instead
            // of being cut short by the previous one's.
            clearTimeout(interventionTimer.current);
            setIntervention(data.intervention);
            interventionTimer.current = setTimeout(() => setIntervention(null), INTERVENTION_MS);
          }
        } else if (data.type === "transcription") {
          setCoaching(data);
          onTranscriptionRef.current?.(data.text);
        }
      };
      ws.onclose = (event) => {
        setConnected(false);
        if (event.code !== 1008) scheduleRetry();
      };
      ws.onerror = (e) => console.error("WebSocket error", e);
    }

    connect();
    const ping = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, PING_MS);

    return () => {
      disposed = true;
      clearInterval(ping);
      clearTimeout(retryTimer);
      clearTimeout(interventionTimer.current);
      ws?.close();
    };
  }, [sessionId]);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(payload);
    return true;
  }, []);

  /** The whole answer so far; the server replaces its previous snapshot. */
  const sendTyped = useCallback(
    (text) => send(JSON.stringify({ type: "text_chunk", text, pause_detected: true })),
    [send],
  );
  /** One complete recording (webm/ogg bytes). */
  const sendAudio = useCallback((buffer) => send(buffer), [send]);
  /** Start a new answer: pace and fillers are measured per answer. */
  const reset = useCallback(() => {
    setCoaching(null);
    setIntervention(null);
    send(JSON.stringify({ type: "reset" }));
  }, [send]);

  return { connected, coaching, intervention, sendTyped, sendAudio, reset };
}
