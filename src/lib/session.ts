const SESSION_STORAGE_KEY = "playgroundai-session-id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "server-render";
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = window.crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}
