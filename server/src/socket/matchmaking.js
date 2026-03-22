// ══════════════════════════════════════════════════════
// Matchmaking + PvP Battle Relay — Socket.io handler
// ══════════════════════════════════════════════════════
const jwt = require('jsonwebtoken');

const WAIT_MS = 15_000; // 15 s before timeout → client falls back to bot
const TURN_MS = 35_000; // 35 s per turn before server force-submits random moves

const queue = []; // [{ socket, userId, username, team, waitTimer }]
const rooms = {}; // { roomId: { p1, p2, turns, turnTimer, seed, turnCount } }
let roomCounter = 0;

function makeRoomId() { return `room_${++roomCounter}_${Date.now()}`; }

function authenticateSocket(token) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret || !token) return null;
    return jwt.verify(token, secret);
  } catch { return null; }
}

function tryMatch(io) {
  while (queue.length >= 2) {
    const p1 = queue.shift();
    const p2 = queue.shift();
    clearTimeout(p1.waitTimer);
    clearTimeout(p2.waitTimer);

    const roomId = makeRoomId();
    const seed   = Math.floor(Math.random() * 2_000_000_000);

    rooms[roomId] = { p1, p2, turns: {}, turnTimer: null, seed, turnCount: 0 };

    p1.socket.join(roomId);
    p2.socket.join(roomId);

    p1.socket.emit('match:found', {
      roomId, seed,
      opponentName: p2.username,
      opponentTeam: p2.team,
      yourTeam:     p1.team,
      youAre:       'p1',
    });
    p2.socket.emit('match:found', {
      roomId, seed,
      opponentName: p1.username,
      opponentTeam: p1.team,
      yourTeam:     p2.team,
      youAre:       'p2',
    });

    startTurnTimer(io, roomId);
    console.log(`🎮 Match: ${p1.username} vs ${p2.username} [${roomId}]`);
  }
}

function startTurnTimer(io, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.turnTimer);
  room.turnTimer = setTimeout(() => {
    const r = rooms[roomId];
    if (!r) return;
    ['p1', 'p2'].forEach(s => {
      if (!r.turns[s]) r.turns[s] = { moves: [0, 0], targets: [0, 0], forced: true };
    });
    relayTurn(io, roomId);
  }, TURN_MS);
}

function relayTurn(io, roomId) {
  const room = rooms[roomId];
  if (!room || !room.turns.p1 || !room.turns.p2) return;
  clearTimeout(room.turnTimer);

  const turnSeed = (room.seed + room.turnCount * 31337) & 0x7fffffff;
  room.turnCount++;
  const p1Turn = room.turns.p1;
  const p2Turn = room.turns.p2;
  room.turns   = {};

  io.to(roomId).emit('turn:execute', {
    p1Moves:   p1Turn.moves,
    p1Targets: p1Turn.targets,
    p2Moves:   p2Turn.moves,
    p2Targets: p2Turn.targets,
    seed:      turnSeed,
  });

  startTurnTimer(io, roomId);
}

function cleanupRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.turnTimer);
  delete rooms[roomId];
}

function setupMatchmaking(io) {
  io.on('connection', (socket) => {

    socket.on('queue:join', ({ token, team, username }) => {
      const decoded  = authenticateSocket(token);
      const userId   = decoded?.id || `guest_${socket.id}`;
      const userName = username    || 'لاعب';

      const existing = queue.findIndex(q => q.userId === userId);
      if (existing >= 0) {
        clearTimeout(queue[existing].waitTimer);
        queue.splice(existing, 1);
      }

      const waitTimer = setTimeout(() => {
        const idx = queue.findIndex(q => q.socket.id === socket.id);
        if (idx >= 0) {
          queue.splice(idx, 1);
          socket.emit('match:timeout');
        }
      }, WAIT_MS);

      queue.push({ socket, userId, username: userName, team, waitTimer });
      socket.emit('queue:joined', { position: queue.length, waitMs: WAIT_MS });
      tryMatch(io);
    });

    socket.on('queue:leave', () => {
      const idx = queue.findIndex(q => q.socket.id === socket.id);
      if (idx >= 0) {
        clearTimeout(queue[idx].waitTimer);
        queue.splice(idx, 1);
      }
      socket.emit('queue:left');
    });

    socket.on('turn:submit', ({ roomId, moves, targets }) => {
      const room = rooms[roomId];
      if (!room) return;
      const side = room.p1.socket.id === socket.id ? 'p1' : 'p2';
      room.turns[side] = { moves, targets };
      socket.emit('turn:ack', { side });
      if (room.turns.p1 && room.turns.p2) relayTurn(io, roomId);
    });

    socket.on('battle:end', ({ roomId, result }) => {
      const room = rooms[roomId];
      if (!room) return;
      const other = room.p1.socket.id === socket.id ? room.p2.socket : room.p1.socket;
      other.emit('battle:opponent_ended', { result: result === 'win' ? 'loss' : 'win' });
      cleanupRoom(roomId);
    });

    socket.on('disconnect', () => {
      const qi = queue.findIndex(q => q.socket.id === socket.id);
      if (qi >= 0) { clearTimeout(queue[qi].waitTimer); queue.splice(qi, 1); }
      Object.entries(rooms).forEach(([roomId, room]) => {
        if (room.p1.socket.id === socket.id || room.p2.socket.id === socket.id) {
          const other = room.p1.socket.id === socket.id ? room.p2.socket : room.p1.socket;
          other.emit('battle:opponent_disconnected');
          cleanupRoom(roomId);
        }
      });
    });
  });
}

module.exports = { setupMatchmaking };