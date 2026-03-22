// ══════════════════════════════════════════
// usePvPEngine — PvP turn relay hook
//
// Sits alongside useBattleEngine.
// When gameMode === 'pvp':
//   1. Player submits moves → socket 'turn:submit'
//   2. Server collects both players' moves
//   3. Server emits 'turn:execute' with both sets + seed
//   4. This hook calls the normal battle engine functions
//      with the remote player's moves injected as "enemy"
// ══════════════════════════════════════════
import { useEffect, useCallback, useRef } from 'react';
import { useBattleStore }  from '../store/battleStore.js';
import { getSocket }       from '../engine/socketClient.js';
import { DamageEngine }    from '../engine/DamageEngine.js';

// Seeded deterministic random — mirrors server-side LCG
function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Patch Math.random temporarily with a seeded version during a turn
let _randomOverride = null;
const _origRandom = Math.random.bind(Math);
Math.random = function () {
  return _randomOverride ? _randomOverride() : _origRandom();
};

export function usePvPEngine(battleEngine) {
  const { executeDualTurn } = battleEngine;
  const listeningRef = useRef(false);
  const waitingRef   = useRef(false);

  // ── Listen for turn:execute from server ─────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (listeningRef.current) return;
    listeningRef.current = true;

    socket.on('turn:execute', ({ p1Moves, p1Targets, p2Moves, p2Targets, seed }) => {
      const s = useBattleStore.getState();
      if (s.gameMode !== 'pvp') return;

      const youAre = s.pvpYouAre; // 'p1' or 'p2'

      // Map server moves to pendingMoves / pendingTargets
      // "my" moves are already set client-side; "opponent" moves come from server
      const myMoves    = youAre === 'p1' ? p1Moves    : p2Moves;
      const myTargets  = youAre === 'p1' ? p1Targets  : p2Targets;
      const opMoves    = youAre === 'p1' ? p2Moves    : p1Moves;
      const opTargets  = youAre === 'p1' ? p2Targets  : p1Targets;

      // Apply opponent's moves as if the "enemy AI" chose them
      useBattleStore.getState().setPvpWaiting(false);

      // Override pending moves with server-authorised values (prevents cheating)
      const st = useBattleStore.getState();
      // For PvP the enemy doesn't go through AI — we set the pendingMoves directly
      // and let executeDualTurn run normally. The "enemy" half will use opMoves.
      // We store opMoves in a special pvp-enemy-moves slot that executeDualTurn reads.
      useBattleStore.setState({
        pendingMoves:    myMoves,
        pendingTargets:  myTargets,
        pvpEnemyMoves:   opMoves,
        pvpEnemyTargets: opTargets,
        pvpTurnSeed:     seed,
      });

      // Run the turn with seeded random
      _randomOverride = seededRandom(seed);
      executeDualTurn();
      // Restore after a tick (executeDualTurn is sync for first pass)
      setTimeout(() => { _randomOverride = null; }, 2000);
    });

    socket.on('battle:opponent_disconnected', () => {
      const s = useBattleStore.getState();
      if (s.gameMode !== 'pvp') return;
      s.addLog('⚠️ انقطع اتصال الخصم — انتصرت!', 'sys');
      // Treat as a win
      useBattleStore.setState({ active: false, overlayResult: true,
        resultData: { type: 'battle', won: true, xp: 30, pvpWalkover: true } });
    });

    socket.on('battle:opponent_ended', ({ result }) => {
      const s = useBattleStore.getState();
      if (s.gameMode !== 'pvp') return;
      if (!s.active) return; // already resolved locally
      const won = result === 'win';
      s.addLog(won ? '🏆 انتصرت!' : '💔 خسرت!', 'sys');
      useBattleStore.setState({ active: false, overlayResult: true,
        resultData: { type: 'battle', won, xp: won ? 30 : 0 } });
    });

    return () => {
      socket.off('turn:execute');
      socket.off('battle:opponent_disconnected');
      socket.off('battle:opponent_ended');
      listeningRef.current = false;
    };
  }, [executeDualTurn]);

  // ── Submit turn moves to server ─────────────────────────────────────────
  const submitPvPTurn = useCallback(() => {
    const s      = useBattleStore.getState();
    const socket = getSocket();

    if (!s.pvpRoomId) return;
    if (waitingRef.current) return;

    waitingRef.current = true;
    useBattleStore.getState().setPvpWaiting(true);
    s.addLog('⌛ في انتظار حركة الخصم...', 'sys');

    socket.emit('turn:submit', {
      roomId:  s.pvpRoomId,
      moves:   s.pendingMoves,
      targets: s.pendingTargets,
    });

    // Wait timer — server will force-submit after 35s, no need for client timer
    setTimeout(() => { waitingRef.current = false; }, 40_000);
  }, []);

  // ── End battle ──────────────────────────────────────────────────────────
  const endPvPBattle = useCallback((won) => {
    const s      = useBattleStore.getState();
    const socket = getSocket();
    if (s.pvpRoomId) {
      socket.emit('battle:end', { roomId: s.pvpRoomId, result: won ? 'win' : 'loss' });
    }
  }, []);

  return { submitPvPTurn, endPvPBattle };
}