// ══════════════════════════════════════════
// PokeHoverCard — Pokémon detail popup with XP/level tracker
// ══════════════════════════════════════════
import { createPortal }       from 'react-dom';
import { useProgressStore }   from '../../store/progressStore.js';
import { POKE_STATS }         from '../../data/pokeStats.js';
import { TYPE_CHART }         from '../../data/typeChart.js';
import { getPokeAbility }     from '../../data/abilities.js';
import { PokeSprite }         from './PokeSprite.jsx';
import { TypeBadge }          from './TypeBadge.jsx';
import styles                 from './PokeHoverCard.module.css';

// ── Helpers ────────────────────────────────────────────────────────────────────
const TYPE_BG = {
  FIRE:'#FF6B35',WATER:'#4FC3F7',GRASS:'#66BB6A',ELECTRIC:'#FFD600',
  ICE:'#81D4FA',FIGHTING:'#E53935',POISON:'#AB47BC',GROUND:'#C8A96E',
  FLYING:'#82B1FF',PSYCHIC:'#EC407A',BUG:'#8BC34A',ROCK:'#A89070',
  GHOST:'#7E57C2',DRAGON:'#5C6BC0',DARK:'#37474F',STEEL:'#90A4AE',
  FAIRY:'#F48FB1',NORMAL:'#BDBDBD',
};

const STAT_ROWS = [
  { key:'hp',  label:'HP',      color:'#F44336', max:255 },
  { key:'a',   label:'Attack',  color:'#FF9800', max:190 },
  { key:'d',   label:'Defense', color:'#2196F3', max:230 },
  { key:'sa',  label:'Sp. Atk', color:'#9C27B0', max:194 },
  { key:'sd',  label:'Sp. Def', color:'#009688', max:230 },
  { key:'sp',  label:'Speed',   color:'#FF5722', max:200 },
];

function getTypeMatchups(types) {
  const ALL = ['NORMAL','FIRE','WATER','ELECTRIC','GRASS','ICE','FIGHTING',
    'POISON','GROUND','FLYING','PSYCHIC','BUG','ROCK','GHOST','DRAGON','DARK','STEEL','FAIRY'];
  const result = {};
  ALL.forEach(atk => {
    let mul = 1;
    types.forEach(def => { mul *= (TYPE_CHART[atk]?.[def] ?? 1); });
    if (mul !== 1) result[atk] = mul;
  });
  const weak   = Object.entries(result).filter(([,m]) => m >= 2).sort((a,b) => b[1]-a[1]);
  const resist = Object.entries(result).filter(([,m]) => m <  1).sort((a,b) => a[1]-b[1]);
  return { weak, resist };
}

// XP bar colour: green → yellow → red as level climbs
function xpBarColor(level) {
  if (level >= 15) return '#FF6B35';
  if (level >= 8)  return '#FFD600';
  return '#66BB6A';
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PokeHoverCard({ poke }) {
  const stats    = POKE_STATS[poke.id];
  const ability  = getPokeAbility(poke.id);
  const progress = useProgressStore();

  const bst          = (stats ? Object.values(stats).reduce((a,b) => a+b, 0) : 0) + poke.hp;
  const winsWithPoke = progress.winsWithPoke[poke.id] || 0;

  // ── Pokémon level + XP ──────────────────────────────────────────────────────
  const xpData     = progress.pokeXpProgress(poke.id);
  const pokeLevel  = xpData.level;
  const xpCurrent  = xpData.current;
  const xpNeeded   = xpData.needed;
  const xpPct      = xpData.pct;
  const totalXp    = progress.pokeRawXp(poke.id);

  const color1 = TYPE_BG[poke.types[0]] || '#4FC3F7';
  const color2 = poke.types[1] ? (TYPE_BG[poke.types[1]] || color1) : color1;
  const isDual = poke.types.length > 1 && color1 !== color2;

  const cardStyle = isDual ? {
    '--accent': color1,
    border: '2px solid transparent',
    borderTop: '6px solid transparent',
    background: `linear-gradient(#0f1520, #0f1520) padding-box,
                 linear-gradient(135deg, ${color1}, ${color2}) border-box`,
  } : {
    '--accent': color1,
    border: `2px solid ${color1}`,
    borderTop: `6px solid ${color1}`,
    background: '#0f1520',
  };

  const headerBg = isDual
    ? `linear-gradient(135deg, ${color1}35 0%, ${color2}35 100%)`
    : `color-mix(in srgb, ${color1} 12%, #0f1520)`;

  const statValues = {
    hp: poke.hp,
    a:  stats?.a  || 0,
    d:  stats?.d  || 0,
    sa: stats?.sa || 0,
    sd: stats?.sd || 0,
    sp: stats?.sp || 0,
  };

  const { weak, resist } = getTypeMatchups(poke.types);

  return createPortal(
    <>
      <div className={styles.overlay} />
      <div className={styles.card} style={cardStyle}>

        {/* ── Header ── */}
        <div className={styles.header} style={{ background: headerBg }}>
          <PokeSprite id={poke.id} name={poke.name} size={90} className={styles.sprite} />
          <div className={styles.headerInfo}>
            <div className={styles.name}>{poke.name}</div>
            <div className={styles.types}>
              {poke.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
            </div>
            <div className={styles.meta}>
              <span style={{ color: color1, fontWeight: 900 }}>Lv.{pokeLevel}</span>
              <span>🏆 {winsWithPoke} انتصار</span>
              <span style={{ color: 'rgba(255,255,255,.45)' }}>BST {bst}</span>
            </div>
          </div>
        </div>

        {/* ── Pokémon XP Bar ── */}
        <div className={styles.xpSection}>
          <div className={styles.xpHeader}>
            <span className={styles.xpLabel}>
              <span className={styles.xpIcon}>⭐</span>
              مستوى البوكيمون
            </span>
            <span className={styles.xpLevelBadge} style={{ background: color1 + '22', color: color1, border: `1px solid ${color1}44` }}>
              Lv.{pokeLevel}
            </span>
          </div>
          <div className={styles.xpBarTrack}>
            <div
              className={styles.xpBarFill}
              style={{
                width: `${xpPct}%`,
                background: `linear-gradient(90deg, ${xpBarColor(pokeLevel)}, ${color1})`,
              }}
            />
          </div>
          <div className={styles.xpNumbers}>
            <span className={styles.xpCurrent}>{xpCurrent} / {xpNeeded} XP</span>
            <span className={styles.xpTotal}>إجمالي: {totalXp} XP</span>
          </div>
          {winsWithPoke > 0 && (
            <div className={styles.xpHint}>
              💡 تكسب XP إضافي كلما انتصرت مع هذا البوكيمون
            </div>
          )}
        </div>

        {/* ── Stat bars ── */}
        <div className={styles.stats}>
          {STAT_ROWS.map(({ key, label, color, max }) => {
            const val = statValues[key];
            const pct = Math.min(100, Math.round((val / max) * 100));
            return (
              <div key={key} className={styles.statRow}>
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statVal} style={{ color }}>{val}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Moves ── */}
        <div className={styles.moves}>
          <div className={styles.sectionTitle}>الحركات</div>
          <div className={styles.moveGrid}>
            {poke.moves.map((mv, i) => (
              <div key={i} className={`${styles.moveCard} ${mv.u ? styles.moveUlt : ''}`}>
                <div className={styles.moveName}>{mv.u ? '⚡ ' : ''}{mv.n}</div>
                <div className={styles.moveBottom}>
                  <TypeBadge type={mv.t} size="sm" />
                  {mv.p > 0 && <span className={styles.movePow}>{mv.p}</span>}
                  {mv.p === 0 && <span className={styles.moveStatus}>STATUS</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Type matchups ── */}
        <div className={styles.matchups}>
          {weak.length > 0 && (
            <div className={styles.matchupRow}>
              <span className={styles.matchupLabel}>ضعيف ضد</span>
              <div className={styles.matchupTypes}>
                {weak.map(([type, mul]) => (
                  <div key={type} className={styles.matchupBadge}>
                    <TypeBadge type={type} size="sm" />
                    {mul === 4 && <span className={styles.mulX}>×4</span>}
                    {mul === 2 && <span className={styles.mulX}>×2</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {resist.length > 0 && (
            <div className={styles.matchupRow}>
              <span className={styles.matchupLabel}>مقاوم لـ</span>
              <div className={styles.matchupTypes}>
                {resist.map(([type, mul]) => (
                  <div key={type} className={styles.matchupBadge}>
                    <TypeBadge type={type} size="sm" />
                    {mul === 0    && <span className={styles.mulImmune}>✕</span>}
                    {mul === 0.5  && <span className={styles.mulHalf}>½</span>}
                    {mul === 0.25 && <span className={styles.mulHalf}>¼</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Ability ── */}
        {ability && (
          <div className={styles.ability}>
            <span className={styles.abilityIcon}>{ability.icon}</span>
            <div>
              <div className={styles.abilityName}>{ability.name}</div>
              <div className={styles.abilityDesc}>{ability.desc}</div>
            </div>
          </div>
        )}

      </div>
    </>,
    document.body
  );
}