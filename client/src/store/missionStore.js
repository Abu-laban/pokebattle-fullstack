// ══════════════════════════════════════════
// Mission Store — tracks progress per goal
// ══════════════════════════════════════════
import { create }           from 'zustand';
import { persist }          from 'zustand/middleware';
import { MISSIONS }         from '../data/missionData.js';
import { useProgressStore, getTrainerRank } from './progressStore.js';
import { useAuthStore }     from './authStore.js';
import { UserAPI }          from '../services/api.js';

// ── helpers ────────────────────────────────────────────────────────────────
function initProgress() {
  const map = {};
  MISSIONS.forEach(m => {
    map[m.id] = m.goals.map(() => 0);
  });
  return map;
}

function isGoalMet(progress, goal) {
  return (progress || 0) >= goal.count;
}

function isMissionComplete(progressArr, goals) {
  return goals.every((g, i) => isGoalMet(progressArr[i], g));
}

export const useMissionStore = create(persist(
  (set, get) => ({
    // { [missionId]: [num, num, ...] } — one number per goal
    progress:  initProgress(),
    completed: [],          // completed mission ids
    streaks:   {},          // { [pokeId]: currentStreak }
    moveStats: {},          // { [moveId]: totalUses }
    totalWins: 0,

    // ── called from useBattleEngine after battle ends ──
    onBattleEnd({ won, teamIds = [], movesUsed = {}, enemyTypes = [] }) {
      if (!won) {
        // reset streaks for all poke in team on loss
        set(s => {
          const streaks = { ...s.streaks };
          teamIds.forEach(id => { streaks[id] = 0; });
          return { streaks };
        });
        return;
      }

      set(s => {
        const streaks   = { ...s.streaks };
        const moveStats = { ...s.moveStats };
        const totalWins = s.totalWins + 1;

        // update streaks
        teamIds.forEach(id => { streaks[id] = (streaks[id] || 0) + 1; });

        // update move usage
        Object.entries(movesUsed).forEach(([mv, count]) => {
          moveStats[mv] = (moveStats[mv] || 0) + count;
        });

        return { streaks, moveStats, totalWins };
      });

      get().checkAllMissions({ won, teamIds, movesUsed, enemyTypes });
    },

    checkAllMissions({ won, teamIds, movesUsed, enemyTypes }) {
      const s         = get();
      const newly     = [];
      const progress  = { ...s.progress };

      // ── also feed unlock system from mission data ──────────────────────────
      if (won) {
        const progressStore = useProgressStore.getState();
        // WIN_WITH / WIN_STREAK both count as winsWithPoke for unlock system
        teamIds.forEach(id => progressStore.recordWinWithPoke?.(id));
        // WIN_TYPE — each type in enemyTypes feeds defeatType for unlocks
        const typeCounts = {};
        enemyTypes.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
        Object.entries(typeCounts).forEach(([type, count]) => {
          for (let i = 0; i < count; i++) progressStore.recordDefeatType?.(type);
        });
      }

      MISSIONS.forEach(mission => {
        if (s.completed.includes(mission.id)) return;

        // rank gate
        const playerLevel = useAuthStore.getState().user?.level
          ?? useProgressStore.getState().level ?? 1;
        const rankOrder = ['beginner','novice','adept','expert','master','legendary'];
        const curRank   = getTrainerRank(playerLevel).rank;
        if (rankOrder.indexOf(curRank) < rankOrder.indexOf(mission.reqRank)) return;

        const prev = progress[mission.id] ? [...progress[mission.id]] : mission.goals.map(()=>0);

        mission.goals.forEach((goal, gi) => {
          if (isGoalMet(prev[gi], goal)) return; // already done

          switch (goal.type) {
            case 'WIN_ANY':
              prev[gi] = Math.min(goal.count, s.totalWins + 1);
              break;
            case 'WIN_WITH':
              if (teamIds.includes(goal.pokeId)) {
                prev[gi] = Math.min(goal.count, (prev[gi] || 0) + 1);
              }
              break;
            case 'WIN_STREAK': {
              const streak = (s.streaks[goal.pokeId] || 0) + (teamIds.includes(goal.pokeId) ? 1 : 0);
              prev[gi] = Math.min(goal.count, streak);
              break;
            }
            case 'WIN_TYPE':
              if (goal.typeTarget) {
                const hits = enemyTypes.filter(t => t === goal.typeTarget).length;
                prev[gi] = Math.min(goal.count, (prev[gi] || 0) + hits);
              }
              break;
            case 'USE_MOVE': {
              const used = (movesUsed[goal.moveId] || 0);
              prev[gi] = Math.min(goal.count, (prev[gi] || 0) + used);
              break;
            }
          }
        });

        progress[mission.id] = prev;

        if (isMissionComplete(prev, mission.goals)) {
          newly.push(mission.id);
        }
      });

      set({ progress });

      if (newly.length) {
        set(s => ({ completed: [...new Set([...s.completed, ...newly])] }));
        newly.forEach(id => get().grantReward(id));
      }
    },

    grantReward(missionId) {
      const mission = MISSIONS.find(m => m.id === missionId);
      if (!mission) return;
      const { reward } = mission;

      // XP
      if (reward.xp) {
        useProgressStore.getState().gainXP?.(reward.xp);
      }

      // XP only — pokemon unlocking is handled exclusively by MissionsScreen unlock system

      // Fire UI event
      window.dispatchEvent(new CustomEvent('mission-complete', {
        detail: { missionId, reward, name: mission.name },
      }));

      // Sync to server
      const token = useAuthStore.getState().token;
      if (token) {
        UserAPI.saveBattleResult({ missionComplete: missionId })
          .catch(() => {});
      }
    },

    getMissionProgress(missionId) {
      const s = get();
      const mission = MISSIONS.find(m => m.id === missionId);
      if (!mission) return null;
      const prog = s.progress[missionId] || mission.goals.map(() => 0);
      return {
        goals: mission.goals.map((g, i) => ({
          ...g,
          current: prog[i] || 0,
          done:    isGoalMet(prog[i] || 0, g),
        })),
        complete: s.completed.includes(missionId),
        pct: Math.round(
          (mission.goals.filter((g, i) => isGoalMet(prog[i], g)).length / mission.goals.length) * 100
        ),
      };
    },

    resetAll() {
      set({ progress: initProgress(), completed: [], streaks: {}, moveStats: {}, totalWins: 0 });
    },

    // restore from server data
    syncFromServer(serverCompleted = []) {
      set(s => ({
        completed: [...new Set([...s.completed, ...serverCompleted])],
      }));
    },
  }),
  {
    name: 'pokebattle-missions',
    merge: (persisted, current) => ({ ...current, ...persisted }),
  }
));