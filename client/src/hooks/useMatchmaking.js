// ══════════════════════════════════════════
// useMatchmaking — PvP matchmaking hook
//
// States:
//   idle       → default
//   searching  → in queue (socket or fallback timer)
//   found      → matched with real player
//   timeout    → no opponent → caller starts bot battle
// ══════════════════════════════════════════
import { useState, useCallback, useEffect, useRef } from 'react';
import { connectSocket, getSocket } from '../engine/socketClient.js';
import { useAuthStore }    from '../store/authStore.js';
import { useBattleStore }  from '../store/battleStore.js';
import { DEX }             from '../data/dex.js';
import { BattleMember }    from '../engine/BattleMember.js';
import { Weather }         from '../engine/Weather.js';

const WAIT_MS = 15_000; // 15 s timeout → bot

function serializeTeam(ids) {
  return ids.map(id => {
    const poke = DEX.find(p => p.id === id);
    return poke ? BattleMember.fresh(poke).toPlain() : null;
  }).filter(Boolean);
}

export function useMatchmaking() {
  const [status,   setStatus]   = useState('idle');
  const [opponent, setOpponent] = useState(null);
  const [roomId,   setRoomId]   = useState(null);

  const timeoutRef  = useRef(null);
  const socketRef   = useRef(null);
  const { user }    = useAuthStore();

  // Cleanup socket listeners
  const cleanListeners = useCallback(() => {
    const s = socketRef.current || getSocket();
    if (!s) return;
    s.off('queue:joined');
    s.off('match:found');
    s.off('match:timeout');
    s.off('queue:left');
  }, []);

  useEffect(() => () => {
    clearTimeout(timeoutRef.current);
    cleanListeners();
  }, [cleanListeners]);

  // ── Start searching ─────────────────────────────────────────────────────
  const startSearch = useCallback(async () => {
    const ids = useBattleStore.getState().selectedIds;
    if (ids.length < 4) return;

    setStatus('searching');
    setOpponent(null);
    setRoomId(null);

    // Always set a client-side fallback timer for the bot
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      cleanListeners();
      setStatus('timeout');
    }, WAIT_MS);

    // Try to connect socket (may be unavailable if package not installed)
    let socket = null;
    try {
      socket = await connectSocket();
    } catch { /* socket.io-client not installed */ }

    // If socket unavailable, the client-side timer above will fire → bot
    if (!socket) return;

    socketRef.current = socket;
    cleanListeners();

    socket.on('queue:joined', ({ position }) => {
      console.log(`🔍 Queue position: ${position}`);
    });

    socket.on('match:found', ({ roomId: rid, seed, opponentName, opponentTeam, yourTeam, youAre }) => {
      clearTimeout(timeoutRef.current);
      cleanListeners();
      setStatus('found');
      setOpponent({ name: opponentName, team: opponentTeam });
      setRoomId(rid);
      // Short pause for the "match found" screen before starting battle
      setTimeout(() => startPvPBattle({ roomId: rid, seed, opponentName, opponentTeam, yourTeam, youAre }), 1500);
    });

    socket.on('match:timeout', () => {
      clearTimeout(timeoutRef.current);
      cleanListeners();
      setStatus('timeout');
    });

    const token    = useAuthStore.getState().token ?? '';
    const username = user?.username ?? 'لاعب';
    socket.emit('queue:join', { token, team: serializeTeam(ids), username });
  }, [user, cleanListeners]);

  // ── Cancel search ────────────────────────────────────────────────────────
  const cancelSearch = useCallback(() => {
    clearTimeout(timeoutRef.current);
    cleanListeners();
    const s = socketRef.current || getSocket();
    if (s) s.emit('queue:leave');
    setStatus('idle');
    setOpponent(null);
    setRoomId(null);
  }, [cleanListeners]);

  // ── Reset to idle (after timeout → bot launched) ─────────────────────────
  const resetSearch = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setStatus('idle');
    setOpponent(null);
    setRoomId(null);
  }, []);

  // ── Launch PvP battle ─────────────────────────────────────────────────────
  function startPvPBattle({ roomId, seed, opponentName, opponentTeam, yourTeam, youAre }) {
    import('../engine/audio.js').then(({ SFX }) => SFX?.playBattleBGM?.()).catch(() => {});

    const myTeam = (yourTeam || []).slice(0, 4);
    const enTeam = (opponentTeam || []).slice(0, 4);
    const anchor = myTeam[0]?.poke || enTeam[0]?.poke;
    while (myTeam.length < 4) myTeam.push(BattleMember.faintedPlaceholder(anchor).toPlain());
    while (enTeam.length < 4) enTeam.push(BattleMember.faintedPlaceholder(anchor).toPlain());

    const names  = myTeam.slice(0, 2).map(t => t.poke?.name).join(' & ');
    const enames = enTeam.slice(0, 2).map(t => t.poke?.name).join(' & ');

    useBattleStore.setState({
      myTeam, enTeam,
      pField: [0,1], eField: [0,1],
      active:  true, pTurn: true, screen: 'battle',
      gameMode: 'pvp', towerActive: false,
      pvpRoomId:   roomId,
      pvpYouAre:   youAre,
      pvpSeed:     seed,
      pvpOpponentName: opponentName,
      pvpWaitingForOpponent: false,
      weather: new Weather().toPlain(),
      pendingMoves:   [null,null],
      pendingTargets: [null,null],
      pendingSwaps:   [null,null],
      turnTimer: 30,
      overlayResult: false,
      log: [
        { text: `⚔ ${names} vs ${enames}!`,           cls:'sys', id:1 },
        { text: `🌐 معركة PvP مع ${opponentName}`,    cls:'sys', id:2 },
      ],
      logCounter: 2,
    });
  }

  return { status, opponent, roomId, startSearch, cancelSearch, resetSearch };
}