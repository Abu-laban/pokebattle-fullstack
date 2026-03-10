import React, { useMemo } from 'react';
import { useProgressStore, getTrainerRank } from '../../store/progressStore';
import { DEX } from '../../data/dex';
import { EVOLUTIONS } from '../../data/evolutionData';
import styles from './StatsOverlay.module.css';

export function StatsOverlay({ isOpen, onClose }) {
  const progress = useProgressStore();

  const stats = useMemo(() => {
    const trainerRank = getTrainerRank(progress.level);
    const totalPokemon = DEX.length;
    const unlockedCount = progress.unlockedPokes.length;
    const nextLevel = progress.level + 1;
    const xpProgressPercent = nextLevel <= 45 ? (progress.xp / (nextLevel * 100)) * 100 : 100;

    // Type wins summary
    const typeWins = Object.entries(progress.winsByType || {})
      .map(([type, count]) => ({ type, count }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top Pokémon by wins
    const topPokes = Object.entries(progress.winsWithPoke || {})
      .map(([pokeId, times]) => {
        const poke = DEX.find(p => p.id === parseInt(pokeId));
        return { poke, times };
      })
      .filter(p => p.poke && p.times > 0)
      .sort((a, b) => b.times - a.times)
      .slice(0, 5);

    return {
      trainerRank,
      totalPokemon,
      unlockedCount,
      collectionPercent: ((unlockedCount / totalPokemon) * 100).toFixed(1),
      winRate: progress.wins + progress.losses > 0
        ? (((progress.wins) / (progress.wins + progress.losses)) * 100).toFixed(1)
        : 0,
      typeWins,
      topPokes,
      xpProgressPercent: xpProgressPercent.toFixed(1),
    };
  }, [progress]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>📊 Trainer Statistics</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Profile Section */}
        <div className={styles.section}>
          <h3>🎖️ Trainer Profile</h3>
          <div className={styles.profileGrid}>
            <div className={styles.stat}>
              <span className={styles.label}>Rank</span>
              <span className={styles.value}>{stats.trainerRank.label}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.label}>Total XP Earned</span>
              <span className={styles.value}>{progress.totalXp}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.label}>EXP Progress</span>
              <div className={styles.progressBar}>
                <div
                  className={styles.progress}
                  style={{ width: `${stats.xpProgressPercent}%` }}
                />
              </div>
              <span className={styles.smallText}>
                {progress.xp} / {(progress.level + 1) * 100}
              </span>
            </div>
          </div>
        </div>

        {/* Battle Statistics */}
        <div className={styles.section}>
          <h3>⚔️ Battle History</h3>
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <span className={styles.label}>Total Wins</span>
              <span className={styles.valueWin}>{progress.wins}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.label}>Total Losses</span>
              <span className={styles.valueLoss}>{progress.losses}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.label}>Win Rate</span>
              <span className={styles.value}>{stats.winRate}%</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.label}>Tower Best</span>
              <span className={styles.value}>{progress.towerBest || 0}</span>
            </div>
          </div>
        </div>

        {/* Collection Progress */}
        <div className={styles.section}>
          <h3>🔓 Collection Progress</h3>
          <div className={styles.stat}>
            <span className={styles.label}>Pokémon Caught</span>
            <span className={styles.value}>
              {stats.unlockedCount} / {stats.totalPokemon}
            </span>
            <div className={styles.progressBar}>
              <div
                className={styles.progress}
                style={{ width: `${stats.collectionPercent}%` }}
              />
            </div>
            <span className={styles.smallText}>{stats.collectionPercent}%</span>
          </div>
        </div>

        {/* Type Wins */}
        {stats.typeWins.length > 0 && (
          <div className={styles.section}>
            <h3>📈 Top Types Defeated</h3>
            <div className={styles.typesList}>
              {stats.typeWins.map(({ type, count }) => (
                <div key={type} className={styles.typeItem}>
                  <span className={styles.typeName}>{type}</span>
                  <span className={styles.count}>×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Pokémon */}
        {stats.topPokes.length > 0 && (
          <div className={styles.section}>
            <h3>⭐ Most Used Pokémon</h3>
            <div className={styles.pokesList}>
              {stats.topPokes.map(({ poke, times }) => (
                <div key={poke.id} className={styles.pokeItem}>
                  <span className={styles.pokeName}>
                    {poke.name}
                  </span>
                  <span className={styles.pokeWins}>
                    {times} win{times !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evolution Progress */}
        <div className={styles.section}>
          <h3>🔄 Evolution Progress</h3>
          <div className={styles.evolutionList}>
            {Object.entries(EVOLUTIONS).slice(0, 5).map(([childId, info]) => {
              const child = DEX.find(p => p.id === parseInt(childId));
              const parent = DEX.find(p => p.id === info.parent);
              if (!child || !parent) return null;
              const winsWithParent = progress.winsWithPoke[info.parent] || 0;
              const parentLevel = progress.pokeLevel(info.parent);
              const unlocked = progress.isPokeUnlocked(child);
              return (
                <div key={childId} className={styles.evolutionItem}>
                  <div className={styles.evolutionNames}>
                    {parent.name} → {child.name}
                  </div>
                  <div className={styles.evolutionReqs}>
                    <div>Wins: {winsWithParent}/1</div>
                    {info.level > 0 && <div>Level: {parentLevel}/{info.level}</div>}
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progress}
                      style={{ width: unlocked ? '100%' : `${Math.min(100, (winsWithParent / 1) * 50 + (info.level > 0 ? Math.min(50, (parentLevel / info.level) * 50) : 50))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
