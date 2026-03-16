import { useMemo, useState, useRef } from 'react';
import { createPortal }              from 'react-dom';
import { useProgressStore, UNLOCK_RULES, getTrainerRank } from '../../store/progressStore.js';
import { useAuthStore }              from '../../store/authStore.js';
import { DEX }                       from '../../data/dex.js';
import { EVOLUTIONS }                from '../../data/evolutionData.js';
import { POKE_STATS }                from '../../data/pokeStats.js';
import { PokeSprite }                from '../UI/PokeSprite.jsx';
import { TypeBadge }                 from '../UI/TypeBadge.jsx';
import styles                        from './MissionsScreen.module.css';

const GEN_RANGES = {
  all:[1,999], 1:[1,151], 2:[152,251], 3:[252,386],
  4:[387,493], 5:[494,649], 6:[650,721], 7:[722,809],
};
const GEN_LABELS = {
  all:'الكل 🌐', 1:'كانتو 🔴', 2:'جوتو 🟡', 3:'هوين 🟢',
  4:'سيتو 💎',  5:'يونوفا ⚫', 6:'كالوس ✦',  7:'ألولا 🌺',
};

function getBST(id, hp) {
  const s = POKE_STATS[id];
  if (!s) return 300;
  return Object.values(s).reduce((a,b)=>a+b,0) + (hp||0);
}

const RANK_LABELS = {
  beginner: '🎓 متدرب', novice: '🌟 مبتدئ', adept: '🔥 ماهر',
  expert: '⚡ خبير',   master: '🏆 سيد',    legendary: '👑 أسطورة',
};
const RANK_ORDER = ['beginner','novice','adept','expert','master','legendary'];

function getRuleCategory(rule, bst) {
  if (!rule)             return { label: '✅ متاح',         color: '#66BB6A', priority: 0 };
  if (rule.megaEvent)    return { label: '🎪 حدث خاص',    color: '#FFD600', priority: 5 };
  if (bst >= 620)        return { label: '🌟 أسطوري نادر', color: '#AB47BC', priority: 4 };
  if (bst >= 580)        return { label: '👑 أسطوري',      color: '#FF9800', priority: 3 };
  if (rule.winWithPoke)  return { label: '🔄 تطور',        color: '#4FC3F7', priority: 2 };
  if (rule.minRank)      return { label: `🎖 ${RANK_LABELS[rule.minRank]||rule.minRank}`, color: '#78909C', priority: 1 };
  if (rule.minLevel)     return { label: '📈 مستوى',       color: '#78909C', priority: 1 };
  return { label: '✅ متاح', color: '#66BB6A', priority: 0 };
}

function buildReqs(poke, progress) {
  const rule = UNLOCK_RULES[poke.id];
  if (!rule) return [];
  const reqs = [];

  if (rule.megaEvent) {
    reqs.push({ done: !!progress.megaEventActive, text: 'متاح فقط خلال حدث خاص 🎪', pct: 0 });
    return reqs;
  }
  if (rule.minRank) {
    const curRank   = getTrainerRank(progress.level || 1);
    const done      = RANK_ORDER.indexOf(curRank.rank) >= RANK_ORDER.indexOf(rule.minRank);
    const reqLabel  = RANK_LABELS[rule.minRank] || rule.minRank;
    reqs.push({ done, text: `ابلغ رتبة ${reqLabel}`, pct: done ? 100 : 0 });
  }
  if (rule.minLevel) {
    const cur = progress.level || 1;
    reqs.push({
      done: cur >= rule.minLevel,
      text: `ابلغ المستوى ${rule.minLevel}`,
      progress: `${Math.min(cur,rule.minLevel)} / ${rule.minLevel}`,
      pct: Math.min(100, Math.round((cur/rule.minLevel)*100)),
    });
  }
  if (rule.towerBest) {
    const cur = progress.towerBest || 0;
    reqs.push({
      done: cur >= rule.towerBest,
      text: `حقق سلسلة ${rule.towerBest} في برج المعارك`,
      progress: `${Math.min(cur,rule.towerBest)} / ${rule.towerBest}`,
      pct: Math.min(100, Math.round((cur/rule.towerBest)*100)),
    });
  }
  if (rule.defeatType) {
    const { type, count } = rule.defeatType;
    const cur = progress.winsByType?.[type] || 0;
    reqs.push({
      done: cur >= count,
      text: `اهزم ${count} بوكيمون من نوع ${type}`,
      progress: `${Math.min(cur,count)} / ${count}`,
      pct: Math.min(100, Math.round((cur/count)*100)),
    });
  }
  if (rule.winWithPoke) {
    const { id: pid, count } = rule.winWithPoke;
    const parent = DEX.find(p => p.id === pid);
    const cur = progress.winsWithPoke?.[pid] || 0;
    reqs.push({
      done: cur >= count,
      text: `انتصر ${count}× مع ${parent?.name ?? '#'+pid}`,
      progress: `${Math.min(cur,count)} / ${count}`,
      pct: Math.min(100, Math.round((cur/count)*100)),
    });
  }
  if (rule.pokeLevel) {
    const { id: pid, level: reqLvl } = rule.pokeLevel;
    const parent = DEX.find(p => p.id === pid);
    const cur = progress.pokeLevel ? progress.pokeLevel(pid) : 1;
    reqs.push({
      done: cur >= reqLvl,
      text: `ارفع ${parent?.name ?? '#'+pid} للمستوى ${reqLvl}`,
      progress: `Lv.${cur} / Lv.${reqLvl}`,
      pct: Math.min(100, Math.round((cur/reqLvl)*100)),
    });
  }
  return reqs;
}

export function MissionsScreen({ onClose }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [genFilter,    setGenFilter]    = useState('all');
  const [search,       setSearch]       = useState('');
  const progress  = useProgressStore();
  const { user }  = useAuthStore();
  const level     = user?.level ?? progress.level ?? 1;
  const rank      = getTrainerRank(level);

  const missions = useMemo(() => DEX.map(poke => {
    const bst        = getBST(poke.id, poke.hp);
    const rule       = UNLOCK_RULES[poke.id];
    const reqs       = buildReqs(poke, progress);
    const isUnlocked = progress.isPokeUnlocked(poke);
    const allDone    = isUnlocked || reqs.every(r => r.done);
    const cat        = getRuleCategory(rule, bst);
    return { poke, bst, reqs, isUnlocked, allDone, cat };
  }), [progress]);

  const filtered = useMemo(() => {
    const [lo, hi] = GEN_RANGES[genFilter] || [1,999];
    let list = missions.filter(m => m.poke.id >= lo && m.poke.id <= hi);
    if (statusFilter === 'locked')   list = list.filter(m => !m.isUnlocked);
    if (statusFilter === 'ready')    list = list.filter(m => !m.isUnlocked && m.allDone);
    if (statusFilter === 'unlocked') list = list.filter(m => m.isUnlocked);
    if (search) {
      const q = search.toUpperCase();
      list = list.filter(m => m.poke.name.includes(q) || m.poke.types.some(t=>t.includes(q)));
    }
    return list;
  }, [missions, statusFilter, genFilter, search]);

  const stats = useMemo(() => ({
    total:    missions.length,
    unlocked: missions.filter(m => m.isUnlocked).length,
    ready:    missions.filter(m => !m.isUnlocked && m.allDone).length,
    locked:   missions.filter(m => !m.isUnlocked && !m.allDone).length,
  }), [missions]);

  const pct = Math.round((stats.unlocked / stats.total) * 100);

  return createPortal((
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>📋 مهام فتح البوكيمون</h2>
            <div className={styles.summary}>
              <span style={{color:'#66BB6A'}}>✅ {stats.unlocked}</span>
              <span style={{color:'#FFD600'}}>⏳ {stats.ready} جاهز</span>
              <span style={{color:'#78909C'}}>🔐 {stats.locked}</span>
              <span style={{color:'rgba(255,255,255,.4)'}}>رتبتك: {rank.label}</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Global XP bar */}
        <div className={styles.globalBar}>
          <div className={styles.globalFill} style={{width:`${pct}%`}} />
        </div>
        <div className={styles.globalPct}>{pct}% مكتمل — {stats.unlocked} / {stats.total}</div>

        {/* Gen filter */}
        <div className={styles.genFilters}>
          {Object.entries(GEN_LABELS).map(([k,l]) => (
            <button key={k}
              className={`${styles.genBtn} ${genFilter===k ? styles.genActive : ''}`}
              onClick={() => setGenFilter(k)}
            >{l}</button>
          ))}
        </div>

        {/* Status + search */}
        <div className={styles.filters}>
          {[{k:'all',l:'الكل'},{k:'ready',l:'⏳ جاهز'},{k:'locked',l:'🔐 مقفل'},{k:'unlocked',l:'✅ مفتوح'}].map(f=>(
            <button key={f.k}
              className={`${styles.filterBtn} ${statusFilter===f.k ? styles.filterActive:''}`}
              onClick={()=>setStatusFilter(f.k)}
            >{f.l}</button>
          ))}
          <input className={styles.searchInput} placeholder="ابحث..." value={search}
            onChange={e=>setSearch(e.target.value)} />
        </div>

        {/* List */}
        <div className={styles.list}>
          {filtered.map(({poke, bst, reqs, isUnlocked, allDone, cat}) => (
            <div key={poke.id}
              className={`${styles.row} ${isUnlocked?styles.rowDone:allDone?styles.rowReady:''}`}
            >
              <div className={styles.spriteWrap}>
                <PokeSprite id={poke.id} name={poke.name} size={42}
                  style={{filter: isUnlocked ? 'none' : 'grayscale(0.5) opacity(0.65)'}} />
              </div>

              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <span className={styles.pokeName}>{poke.name}</span>
                  <div className={styles.types}>
                    {poke.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                  </div>
                  <span className={styles.bst}>BST {bst}</span>
                  <span className={styles.catTag}
                    style={{color:cat.color, borderColor:cat.color+'44', background:cat.color+'15'}}>
                    {cat.label}
                  </span>
                </div>

                {!isUnlocked && reqs.length > 0 && (
                  <div className={styles.reqs}>
                    {reqs.map((req,i) => (
                      <div key={i} className={`${styles.req} ${req.done?styles.reqDone:''}`}>
                        <span>{req.done ? '✅' : '⭕'}</span>
                        <span className={styles.reqText}>{req.text}</span>
                        {req.progress && (
                          <div className={styles.reqProgress}>
                            <div className={styles.reqBar}>
                              <div className={styles.reqFill} style={{width:`${req.pct}%`}}/>
                            </div>
                            <span className={styles.reqPct}>{req.progress}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {isUnlocked && <div className={styles.unlockedMsg}>✓ مفتوح — جاهز للمعركة</div>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className={styles.empty}>لا توجد نتائج</div>}
        </div>

      </div>
    </div>
  ), document.body);
}