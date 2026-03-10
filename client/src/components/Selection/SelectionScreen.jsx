// ══════════════════════════════════════════
// Selection Screen — Choose your team
// ══════════════════════════════════════════
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useBattleStore }   from '../../store/battleStore.js';
import { useProgressStore, UNLOCK_RULES } from '../../store/progressStore.js';
import { DEX }              from '../../data/dex.js';
import { PokeSprite }       from '../UI/PokeSprite.jsx';
import { TypeBadge }        from '../UI/TypeBadge.jsx';
import { StatsOverlay }     from '../Overlays/StatsOverlay.jsx';
import styles               from './SelectionScreen.module.css';
import { getPokeAbility }  from '../../data/abilities.js';
import { POKE_STATS }      from '../../data/pokeStats.js';

const GEN_RANGES = {
  all: [1, 999],
  1:   [1,   151],
  2:   [152, 251],
  3:   [252, 386],
  4:   [387, 493],
  5:   [494, 649],
  6:   [650, 721],
  7:   [722, 809],
};

const GEN_LABELS = {
  all: { label: 'الكل',    icon: '✦',  sub: '894 بوكيمون' },
  1:   { label: 'كانتو',   icon: '🔴', sub: 'Gen I · R/B/Y' },
  2:   { label: 'جوتو',    icon: '🌿', sub: 'Gen II · G/S/C' },
  3:   { label: 'هوين',    icon: '🌊', sub: 'Gen III · R/S/E' },
  4:   { label: 'سينّو',   icon: '💎', sub: 'Gen IV · D/P/P' },
  5:   { label: 'يونوفا',  icon: '⚡', sub: 'Gen V · B/W' },
  6:   { label: 'كالوس',   icon: '✨', sub: 'Gen VI · X/Y' },
  7:   { label: 'ألولا',   icon: '🌺', sub: 'Gen VII · S/M' },
};

export function SelectionScreen() {
  const selectedIds = useBattleStore(s => s.selectedIds);
  const currentGen  = useBattleStore(s => s.currentGen);

  const [statsOpen, setStatsOpen] = useState(false);

  // Apply gen-specific body background
  useEffect(() => {
    document.body.classList.remove('gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','gen-7');
    if (currentGen !== 'all') document.body.classList.add('gen-' + currentGen);
    return () => document.body.classList.remove('gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','gen-7');
  }, [currentGen]);
  const togglePoke  = useBattleStore(s => s.toggleSelectPoke);
  const removePoke  = useBattleStore(s => s.removeFromTeam);
  const setGen      = useBattleStore(s => s.setGen);
  const startBattle = useBattleStore(s => s.startBattle);
  const selectRandomTeam = useBattleStore(s => s.selectRandomTeam);
  const setScreen   = useBattleStore(s => s.setScreen);
  const level       = useProgressStore(s => s.level);
  const xp          = useProgressStore(s => s.xp);
  const xpPercent   = useProgressStore(s => s.xpPercent());
  const rankTitle   = useProgressStore(s => s.getRankTitle());
  const towerBest   = useProgressStore(s => s.towerBest);
  const wins        = useProgressStore(s => s.wins);
  const losses      = useProgressStore(s => s.losses);
  const isUnlocked  = useProgressStore(s => s.isPokeUnlocked);

  const [search, setSearch] = useState('');

  const handleSelectPoke = useCallback((id, e) => {
    togglePoke(id);
  }, [togglePoke]);

  const filtered = useMemo(() => {
    const [lo, hi] = GEN_RANGES[currentGen] || [1, 999];
    return DEX.filter(p => {
      const inGen = p.id >= lo && p.id <= hi;
      const inSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return inGen && inSearch;
    });
  }, [currentGen, search]);

  const canStart = selectedIds.length >= 4;

  return (
    <div className={styles.screen}>
      <StatsOverlay isOpen={statsOpen} onClose={() => setStatsOpen(false)} />
      
      {/* Profile bar */}
      <div className={styles.profileBar}>
        <div className={styles.profileLeft}>
          <span className={styles.levelBadge}>Lv.{level}</span>
          <div className={styles.xpBar}>
            <div className={styles.xpFill} style={{ width: `${xpPercent}%` }} />
          </div>
          <span className={styles.rankTitle}>{rankTitle}</span>
        </div>
        <div className={styles.profileRight}>
          🏆 انتصارات: <strong>{wins}</strong> / خسائر: <strong>{losses}</strong> · 🏰 أفضل برج: <strong>{towerBest}</strong>
          <button
            className={styles.statsBtn}
            onClick={() => setStatsOpen(true)}
            title="عرض الإحصائيات"
          >
            📊
          </button>
        </div>
      </div>

      {/* Gen tabs */}
      <div className={styles.genTabs}>
        {Object.entries(GEN_LABELS).map(([gen, info]) => (
          <button
            key={gen}
            className={`${styles.genTab} ${styles['g-' + gen]} ${currentGen === gen ? styles.active : ''}`}
            onClick={() => { setGen(gen); }}
          >
            <span className={styles.genIcon}>{info.icon}</span>
            <span className={styles.genLabel}>{info.label}</span>
            <span className={styles.genSub}>{info.sub}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <input
          className={styles.search}
          placeholder="🔍 ابحث عن بوكيمون..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Info bar */}
      <div className={styles.infoBar}>
        {selectedIds.length === 0
          ? 'اختر 4 بوكيمون للمعركة (1، 2 يدخلان، 3، 4 احتياط)'
          : `تم اختيار ${selectedIds.length}/4 بوكيمون`}
      </div>

      {/* Team bar */}
      {selectedIds.length > 0 && (
        <TeamBar ids={selectedIds} onRemove={removePoke} />
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          className={styles.randomBtn}
          onClick={selectRandomTeam}
        >
          <div style={{marginBottom: '8px'}}>اختر فريق عشوائي</div>
          <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Poké Ball" style={{width: '20px', height: '20px'}} />
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png" alt="Great Ball" style={{width: '20px', height: '20px'}} />
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png" alt="Ultra Ball" style={{width: '20px', height: '20px'}} />
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png" alt="Master Ball" style={{width: '20px', height: '20px'}} />
          </div>
        </button>
        <button
          className={styles.startBtn}
          disabled={!canStart}
          onClick={startBattle}
        >
          ⚔ بدء المعركة 2v2
        </button>
        <button
          className={styles.towerBtn}
          onClick={() => setScreen('tower-pick')}
        >
          🏰 برج المعارك
        </button>
      </div>

      {/* Poke grid */}
      <PokeGrid
        pokes={filtered}
        selectedIds={selectedIds}
        unlockedFn={isUnlocked}
        onSelect={handleSelectPoke}
      />
    </div>
  );
}

// ── Team bar ──────────────────────────────────────────────────────────────────
function TeamBar({ ids, onRemove }) {
  return (
    <div className={styles.teamBar}>
      {ids.map(id => {
        const poke = DEX.find(p => p.id === id);
        if (!poke) return null;
        const stats = POKE_STATS[id];
        const bst = poke.hp + (stats ? Object.values(stats).reduce((a,b)=>a+b,0) : 0);
        return (
          <div key={id} className={styles.teamSlot}>
            <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px'}}>
              <PokeSprite id={id} name={poke.name} size={38} animated={true} />
              <div style={{textAlign: 'center', flex: 1}}>
                <div style={{fontFamily: "'Cairo', sans-serif", fontSize: '11px', fontWeight: '700', color: '#fff', marginBottom: '3px'}}>{poke.name.toUpperCase()}</div>
                <div style={{display: 'flex', gap: '2px', justifyContent: 'center', marginBottom: '3px', flexWrap: 'wrap'}}>
                  {poke.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                </div>
                <div style={{fontFamily: "'Cairo', sans-serif", fontSize: '9px', color: 'rgba(255,255,255,.6)'}}>
                  <div>❤️ {poke.hp}HP</div>
                  <div>⭐ BST: {bst}</div>
                </div>
              </div>
            </div>
            <button className={styles.removeBtn} onClick={() => onRemove(id)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Pokemon grid with lazy loading ────────────────────────────────────────────
function PokeGrid({ pokes, selectedIds, unlockedFn, onSelect }) {
  const progress = useProgressStore();

  const computeReason = (p) => {
    const lvlReq = Math.ceil(p.id / 50);
    const rule = UNLOCK_RULES[p.id];
    if (rule) {
      if (rule.megaEvent && !progress.megaEventActive) return '🔐 يتطلب حدث مخصص لفتح';
      if (rule.minLevel && progress.level < rule.minLevel) return `🔐 يتطلب مستوى ${rule.minLevel}+`;
      if (rule.pokeLevel) {
        const parentPoke = DEX.find(x => x.id === rule.pokeLevel.id);
        const parentName = parentPoke ? parentPoke.name : `#${rule.pokeLevel.id}`;
        const parentLvl = progress.pokeLevel(rule.pokeLevel.id);
        const lvlReq = rule.pokeLevel.level;
        return `🔐 ${parentName} يجب أن يصل مستوى ${lvlReq} (حالياً: ${parentLvl})`;
      }
      if (rule.winWithPoke) {
        const targetPoke = DEX.find(x => x.id === rule.winWithPoke.id);
        const targetName = targetPoke ? targetPoke.name : `#${rule.winWithPoke.id}`;
        const winsNeeded = rule.winWithPoke.count;
        const winsGot = progress.winsWithPoke[rule.winWithPoke.id] || 0;
        return `🔐 ارح ${winsNeeded} مرات مع ${targetName} (${winsGot}/${winsNeeded})`;
      }
      if (rule.defeatType) return `🔐 اهزم ${rule.defeatType.count} × من نوع ${rule.defeatType.type}`;
      if (rule.winWithTeam) return `🔐 اربح ${rule.winWithTeam.count} مرات بهذا الفريق`;
      if (rule.towerBest) return `🔐 سلسلة برج ${rule.towerBest}+`; 
    }
    if (progress.level < lvlReq) return `🔐 يتطلب مستوى ${lvlReq} أو أعلى`;
    return '🔐 مقفل';
  };

  return (
    <div className={styles.grid}>
      {pokes.map((p, i) => {
        const locked = unlockedFn && !unlockedFn(p);
        const reason = locked ? computeReason(p) : '';
        return (
          <PokeCard
            key={p.id}
            poke={p}
            selected={selectedIds.includes(p.id)}
            locked={locked}
            disabled={(selectedIds.length >= 4 && !selectedIds.includes(p.id)) || locked}
            delay={Math.min(i * 0.02, 0.5)}
            onSelect={(e) => onSelect(p.id, e)}
            lockReason={reason}
          />
        );
      })}
    </div>
  );
}

// ── Single pokemon card ───────────────────────────────────────────────────────
function PokeHoverCard({ poke }) {
  const stats   = POKE_STATS[poke.id];
  const ability = getPokeAbility(poke.id);
  const progress = useProgressStore();
  
  const bst = stats ? Object.values(stats).reduce((a, b) => a + b, 0) + poke.hp : poke.hp;
  const winsWithPoke = progress.winsWithPoke[poke.id] || 0;
  const pokeLevel = progress.pokeLevel(poke.id);
  
  // Get primary type for background color
  const primaryType = poke.types[0];
  const typeColors = {
    'FIRE': '#FF6B35', 'WATER': '#4FC3F7', 'GRASS': '#66BB6A', 'ELECTRIC': '#FFD600',
    'ICE': '#81D4FA', 'FIGHTING': '#E53935', 'POISON': '#AB47BC', 'GROUND': '#A1887F',
    'FLYING': '#5E35B1', 'PSYCHIC': '#EC407A', 'BUG': '#8BC34A', 'ROCK': '#795548',
    'GHOST': '#757575', 'DRAGON': '#5C6BC0', 'DARK': '#424242', 'STEEL': '#B0BEC5',
    'FAIRY': '#F06292', 'NORMAL': '#BDBDBD'
  };
  const bgColor = typeColors[primaryType] || '#4FC3F7';
  
  return (
    <>
      <div className={styles.hoverCardOverlay} />
      <div 
        className={styles.hoverCard}
        style={{
          '--card-color': bgColor
        }}
      >
      {/* Header with gradient background */}
      <div className={styles.hoverCardHeader}>
        <PokeSprite id={poke.id} name={poke.name} size={120} className={styles.hoverCardImg} />
      </div>
      
      {/* Content section */}
      <div className={styles.hoverCardContent}>
        <div className={styles.hoverCardName}>{poke.name}</div>
        
        {/* Types */}
        <div className={styles.hoverCardTypes}>
          {poke.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
        </div>
        
        {/* Stats grid */}
        <div className={styles.hoverCardStats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>❤️ HP</span>
            <span className={styles.statValue}>{poke.hp}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>⭐ BST</span>
            <span className={styles.statValue}>{bst}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>📊 Lvl</span>
            <span className={styles.statValue}>{pokeLevel}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>🏆 Wins</span>
            <span className={styles.statValue}>{winsWithPoke}</span>
          </div>
        </div>
        
        {/* Ability */}
        {ability && (
          <div className={styles.hoverCardAbility}>
            <span className={styles.abilityIcon}>{ability.icon}</span>
            <div>
              <div className={styles.abilityName}>{ability.name}</div>
              <div className={styles.abilityDesc}>{ability.desc}</div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function PokeCard({ poke, selected, disabled, locked, lockReason, delay, onSelect, progress }) {
  const ref       = useRef(null);
  const [vis, setVis] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { rootMargin: '150px' }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.card} ${selected ? styles.sel : ''} ${disabled ? styles.disabled : ''} ${locked ? styles.locked : ''}`}
      style={{ animationDelay: `${delay}s` }}
      onClick={disabled ? undefined : (e) => onSelect(e)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {vis && <PokeSprite id={poke.id} name={poke.name} size={80} className={styles.cardImg} />}
      {!vis && <div className={styles.cardImgPlaceholder} />}
      <span className={styles.cardName}>{poke.name}{locked && ' 🔒'}</span>
      <div className={`${styles.cardTypes} ${locked ? styles.lockedTypes : ''}`}>
        {poke.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
      </div>
      <PokeCardMeta poke={poke} />
      {showTooltip && (
        locked ? (
          <div className={styles.lockTooltip}>{lockReason}</div>
        ) : (
          <PokeHoverCard poke={poke} />
        )
      )}
    </div>
  );
}

// ── Stats meta row ───────────────────────────────────────────────────────────
function PokeCardMeta({ poke }) {
  const stats   = POKE_STATS[poke.id];
  const ability = getPokeAbility(poke.id);
  const bst     = stats ? Object.values(stats).reduce((a, b) => a + b, 0) + poke.hp : null;
  const pokeLevel = useProgressStore(s => s.pokeLevel)(poke.id);
  return (
    <div className={styles.cardMeta}>
      {ability && (
        <span className={styles.abilityTag} title={ability.name + ': ' + ability.desc}>
          {ability.icon}
        </span>
      )}
      <span className={styles.cardHp}>HP {poke.hp}</span>
      {bst && (
        <span className={styles.bstTag} title={'مجموع الإحصائيات: ' + bst}>
          ⭐{bst}
        </span>
      )}
      {pokeLevel && pokeLevel > 1 && (
        <span className={styles.levelTag} title={`Level ${pokeLevel}`}>Lv.{pokeLevel}</span>
      )}
    </div>
  );
}
