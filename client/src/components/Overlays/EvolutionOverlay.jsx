// EvolutionOverlay — lists evolution/unlock tasks and progress
import { useBattleStore } from '../../store/battleStore.js';
import { useProgressStore, UNLOCK_RULES } from '../../store/progressStore.js';
import { DEX } from '../../data/dex.js';
import styles from './EvolutionOverlay.module.css';

export function EvolutionOverlay() {
  const show = useBattleStore(s => s.overlayEvolution);
  const close = useBattleStore(s => s.closeEvolution);
  const progress = useProgressStore();

  if (!show) return null;

  // build task list from UNLOCK_RULES and EVOLUTIONS (conditions)
  const tasks = [];
  DEX.forEach(p => {
    if (progress.isPokeUnlocked(p)) return; // already unlocked
    const rule = UNLOCK_RULES[p.id];
    if (!rule) return;

    let desc = '';
    const checks = [];
    if (rule.minLevel) {
      checks.push({ done: progress.level >= rule.minLevel, text: `Lvl ${rule.minLevel}+` });
    }
    if (rule.winWithPoke) {
      const got = progress.winsWithPoke[rule.winWithPoke.id] || 0;
      checks.push({ done: got >= rule.winWithPoke.count, text: `Win ${rule.winWithPoke.count}x with ${getName(rule.winWithPoke.id)}` });
    }
    if (rule.pokeLevel) {
      const lvl = progress.pokeLevel(rule.pokeLevel.id);
      checks.push({ done: lvl >= rule.pokeLevel.level, text: `${getName(rule.pokeLevel.id)} Lvl ${rule.pokeLevel.level}` });
    }
    if (rule.defeatType) {
      const cnt = progress.winsByType[rule.defeatType.type] || 0;
      checks.push({ done: cnt >= rule.defeatType.count, text: `Defeat ${rule.defeatType.count} ${rule.defeatType.type}` });
    }
    if (rule.winWithTeam) {
      const key = rule.winWithTeam.ids.sort((a,b)=>a-b).join(',');
      const cnt = progress.winsWithTeam[key] || 0;
      const names = rule.winWithTeam.ids.map(id=>getName(id)).join(', ');
      checks.push({ done: cnt >= rule.winWithTeam.count, text: `Win ${rule.winWithTeam.count}x with [${names}]` });
    }
    if (rule.towerBest) {
      checks.push({ done: progress.towerBest >= rule.towerBest, text: `Tower streak ${rule.towerBest}+` });
    }
    if (rule.megaEvent && !progress.megaEventActive) {
      checks.push({ done: false, text: `Mega event active` });
    }

    if (checks.length) {
      tasks.push({ poke: p, checks });
    }
  });

  function getName(id) {
    const p = DEX.find(x => x.id === id);
    return p ? p.name : `#${id}`;
  }

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.box} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>📜 مهام التطور</div>
        <div className={styles.taskList}>
          {tasks.length === 0 && <div>لا توجد مهام حالياً. كل البوكيمونات متاحة أو لا قواعد خاصة.</div>}
          {tasks.map(t => (
            <div key={t.poke.id} className={styles.taskItem}>
              <div className={styles.pokeName}>{t.poke.name}</div>
              <ul>
                {t.checks.map((c,i) => (
                  <li key={i} className={c.done ? styles.done : ''}>{c.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <button className={styles.closeBtn} onClick={close}>إغلاق</button>
      </div>
    </div>
  );
}