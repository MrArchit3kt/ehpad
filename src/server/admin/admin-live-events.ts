import "server-only";

type Listener = (payload?: string) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribeAdminEvent(channel: string, listener: Listener) {
  let listeners = channels.get(channel);

  if (!listeners) {
    listeners = new Set();
    channels.set(channel, listeners);
  }

  listeners.add(listener);

  return () => {
    const current = channels.get(channel);

    if (!current) return;

    current.delete(listener);

    if (current.size === 0) {
      channels.delete(channel);
    }
  };
}

export function publishAdminEvent(channel: string, payload = "updated") {
  const listeners = channels.get(channel);

  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    try {
      listener(payload);
    } catch (error) {
      console.error("ADMIN_LIVE_EVENT_LISTENER_ERROR", error);
    }
  }
}