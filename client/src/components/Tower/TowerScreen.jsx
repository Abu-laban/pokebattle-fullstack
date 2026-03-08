// ══════════════════════════════════════════
// TowerScreen — Team selection for Battle Tower
// Shows: names, types, HP, gen info
// ══════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from 'react';
import { useBattleStore }   from '../../store/battleStore.js';
import { DEX }              from '../../data/dex.js';
import { TypeBadge }        from '../UI/TypeBadge.jsx';
import { POKE_STATS }       from '../../data/pokeStats.js';
import { getPokeAbility }   from '../../data/abilities.js';
import { loadSpriteWithFallback } from '../../engine/sprites.js';
import styles               from './TowerScreen.module.css';

const GEN_RANGES = [
  { label:'كانتو', lo:1,   hi:151, color:'#EF5350' },
  { label:'جوتو',  lo:152, hi:251, color:'#FFB300' },
  { label:'هوين',  lo:252, hi:386, color:'#42A5F5' },
  { label:'سينّو', lo:387, hi:493, color:'#7E57C2' },
  { label:'يونوفا',lo:494, hi:649, color:'#78909C' },
  { label:'كالوس', lo:650, hi:721, color:'#EC407A' },
  { label:'ألولا', lo:722, hi:809, color:'#FFC107' },
];

function getGen(id) {
  return GEN_RANGES.find(g => id >= g.lo && id <= g.hi) || { label:'أخرى', color:'#90A4AE' };
}

function getBST(poke) {
  const s = POKE_STATS[poke.id];
  if (!s) return 0;
  return poke.hp + Object.values(s).reduce((a,b)=>a+b,0);
}

export function TowerScreen() {
  const towerTeam    = useBattleStore(s => s.towerTeam);
  const addTowerPoke = useBattleStore(s => s.addTowerPoke);
  const removePoke   = useBattleStore(s => s.removeTowerPoke);
  const startTower   = useBattleStore(s => s.startTower);
  const setScreen    = useBattleStore(s => s.setScreen);
  const [search, setSearch] = useState('');
  const [genFilter, setGenFilter] = useState('all');

  const available = useMemo(() => {
    return DEX.filter(p => {
      if (towerTeam.some(t => t.poke.id === p.id)) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (genFilter !== 'all') {
        const g = GEN_RANGES.find(x => x.label === genFilter);
        if (g && (p.id < g.lo || p.id > g.hi)) return false;
      }
      return true;
    });
  }, [towerTeam, search, genFilter]);

  const canStart = towerTeam.length >= 1;

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.back} onClick={() => setScreen('selection')}>
          ← رجوع
        </button>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>🏰 برج المعارك</h2>
          <p className={styles.sub}>اختر حتى 6 بوكيمون لاجتياز أطول سلسلة ممكنة</p>
        </div>
      </div>

      {/* Team slots */}
      <div className={styles.slots}>
        {Array.from({ length: 6 }, (_, i) => (
          <TowerSlot key={i} slot={towerTeam[i]} index={i} onRemove={() => removePoke(i)} />
        ))}
      </div>

      {/* Start button */}
      <button className={styles.startBtn} disabled={!canStart} onClick={startTower}>
        🏰 ادخل البرج <span className={styles.counter}>({towerTeam.length}/6)</span>
      </button>

      {/* Filters */}
      <div className={styles.filterRow}>
        <input
          className={styles.search}
          placeholder="🔍 ابحث عن بوكيمون..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className={styles.genSelect} value={genFilter} onChange={e => setGenFilter(e.target.value)}>
          <option value="all">كل الأجيال</option>
          {GEN_RANGES.map(g => (
            <option key={g.label} value={g.label}>{g.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.gridInfo}>
        {available.length} بوكيمون متاح
      </div>

      {/* Pokemon grid */}
      <div className={styles.grid}>
        {available.map(p => (
          <TowerCard
            key={p.id}
            poke={p}
            disabled={towerTeam.length >= 6}
            onClick={() => towerTeam.length < 6 && addTowerPoke(p)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Slot card (selected team) ────────────────────────────────────────────────
function TowerSlot({ slot, index, onRemove }) {
  const imgRef = useRef(null);
  useEffect(() => {
    if (imgRef.current && slot?.poke)
      loadSpriteWithFallback(imgRef.current, slot.poke.id, slot.poke.name);
  }, [slot?.poke?.id]);

  if (!slot) {
    return (
      <div className={`${styles.slot} ${styles.empty}`}>
        <span className={styles.slotNum}>{index + 1}</span>
        <span className={styles.plus}>+</span>
        <span className={styles.emptyLabel}>فارغ</span>
      </div>
    );
  }
  const gen = getGen(slot.poke.id);
  return (
    <div className={`${styles.slot} ${styles.filled}`} style={{ borderColor: gen.color + '55' }}>
      <span className={styles.slotNum}>{index + 1}</span>
      <img ref={imgRef} alt={slot.poke.name} className={styles.slotImg} />
      <span className={styles.slotName}>{slot.poke.name}</span>
      <div className={styles.slotTypes}>
        {slot.poke.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
      </div>
      <span className={styles.slotHp}>❤ {slot.poke.hp}</span>
      <span className={styles.slotGen} style={{ color: gen.color }}>{gen.label}</span>
      <button className={styles.removeBtn} onClick={onRemove}>✕</button>
    </div>
  );
}

// ── Grid card (pick list) ────────────────────────────────────────────────────
function TowerCard({ poke, disabled, onClick }) {
  const imgRef = useRef(null);
  useEffect(() => {
    if (imgRef.current) loadSpriteWithFallback(imgRef.current, poke.id, poke.name);
  }, [poke.id]);

  const gen     = getGen(poke.id);
  const bst     = getBST(poke);
  const ability = getPokeAbility(poke.id);

  return (
    <div
      className={`${styles.card} ${disabled ? styles.disabled : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <span className={styles.genTag} style={{ background: gen.color + '22', color: gen.color }}>
        {gen.label}
      </span>
      <img ref={imgRef} alt={poke.name} className={styles.cardImg} />
      <span className={styles.cardName}>{poke.name}</span>
      <div className={styles.cardTypes}>
        {poke.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
      </div>
      <div className={styles.cardStats}>
        <span className={styles.hpTag}>❤ {poke.hp}</span>
        {bst > 0 && <span className={styles.bstTag}>⭐{bst}</span>}
        {ability && <span title={ability.name}>{ability.icon}</span>}
      </div>
    </div>
  );
}
