// ══════════════════════════════════════════
// socketClient — PvP matchmaking socket
// Gracefully falls back to "no socket" if
// socket.io-client is not installed yet.
// ══════════════════════════════════════════

const SERVER = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':5000') : 'http://localhost:5000');

let _socket    = null;
let _available = null; // null = unknown, true/false once checked

// Lazy-check if socket.io-client is available
async function checkAvailable() {
  if (_available !== null) return _available;
  try {
    await import('socket.io-client');
    _available = true;
  } catch {
    _available = false;
    console.warn('[socketClient] socket.io-client not installed — PvP will use bot fallback');
  }
  return _available;
}

// Returns null if not available
export async function getSocketAsync() {
  const ok = await checkAvailable();
  if (!ok) return null;
  if (!_socket) {
    const { io } = await import('socket.io-client');
    _socket = io(SERVER, {
      autoConnect:     false,
      reconnection:    true,
      transports:      ['websocket', 'polling'],
      withCredentials: true,
    });
  }
  return _socket;
}

export function getSocket() { return _socket; }

export async function connectSocket() {
  const s = await getSocketAsync();
  if (!s) return null;
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (_socket?.connected) _socket.disconnect();
}

export function isSocketAvailable() { return _available === true; }