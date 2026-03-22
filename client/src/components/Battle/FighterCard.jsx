// FighterCard — Battle card with floating damage numbers
// Attack indicator badges are rendered OUTSIDE the card (by FighterCardWithBadge)
// to avoid being clipped by overflow:hidden on the card and arena containers.
import { useRef, useEffect, useState } from 'react';
import { HPBar }                  from '../UI/HPBar.jsx';
import { loadSpriteWithFallback } from '../../engine/sprites.js';
import { subscribeBattleAnim }    from '../../store/battleStore.js';
import { STAT_AR }                from '../../engine/status.js';
import { getPokeAbility }         from '../../data/abilities.js';
import { TYPE_COLORS }            from '../../data/typeChart.js';
import { DamageEngine }           from '../../engine/DamageEngine.js';
import styles                     from './FighterCard.module.css';

const STATUS_CFG = {
  SLP: { icon:'😴', label:'نائم',   bg:'#4A148C', fg:'#E1BEE7' },
  PAR: { icon:'⚡', label:'مشلول', bg:'#F9A825', fg:'#1A1A1A' },
  BRN: { icon:'🔥', label:'محترق', bg:'#BF360C', fg:'#FFCCBC' },
  PSN: { icon:'☠',  label:'مسموم', bg:'#6A1FA0', fg:'#CE93D8' },
  FRZ: { icon:'❄',  label:'مجمّد', bg:'#006064', fg:'#80DEEA' },
  CNF: { icon:'😵', label:'مرتبك', bg:'#E65100', fg:'#FFE0B2' },
};

// Slot accent colours
const SLOT_COLORS = ['#4FC3F7', '#FF6B35'];

/** Floating damage number that animates upward then fades */
function DmgFloat({ damage, color, isCrit, isHeal, id }) {
  return (
    <div
      key={id}
      className={`${styles.dmgFloat} ${isCrit ? styles.crit : ''} ${isHeal ? styles.heal : ''}`}
      style={{ color }}
    >
      {isHeal ? `+${damage}` : `-${damage}`}
      {isCrit && <span style={{ fontSize: 10, marginLeft: 3, opacity: .9 }}>CRIT!</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  AttackBadgesOverlay — rendered OUTSIDE the card, positioned
//  absolutely relative to the .cardWrapper so overflow:hidden on
//  the card itself never clips the badge.
// ─────────────────────────────────────────────────────────────────
export function AttackBadgesOverlay({ attackers }) {
  if (!attackers?.length) return null;
  return (
    <div className={styles.badgesOverlay}>
      {attackers.map((a, i) => {
        const typeColor  = TYPE_COLORS[a.moveType] || '#888';
        const effInfo    = DamageEngine.effLabel(a.mult);
        const isTargeted = a.targeted !== false; // default true for backwards compat

        if (!isTargeted) {
          // ── NOT targeting this enemy — show a dimmed "going elsewhere" hint ──
          return (
            <div key={i} className={styles.attackBadgeAway}>
              <span className={styles.attackBadgeDot} style={{ background: a.slotColor, opacity: .5 }} />
              <span className={styles.attackBadgeSlot} style={{ color: a.slotColor, opacity: .5 }}>{a.slotLabel}</span>
              <span className={styles.attackBadgeMoveAway}>{a.moveName}</span>
              {/* Show what the effectiveness WOULD be if aimed here */}
              {effInfo && (
                <span className={styles.attackBadgeWouldBe} style={{ color: effInfo.color }}>
                  {effInfo.text} لو استهدف
                </span>
              )}
              <span className={styles.attackBadgeNotHere}>↗ يستهدف الآخر</span>
            </div>
          );
        }

        // ── Targeting this enemy ──────────────────────────────────────────────
        // Determine border glow color based on effectiveness
        const glowColor = effInfo
          ? effInfo.color
          : 'rgba(255,255,255,.2)';

        return (
          <div
            key={i}
            className={styles.attackBadge}
            style={{ borderColor: glowColor + '55', boxShadow: `0 0 8px ${glowColor}22` }}
          >
            <span className={styles.attackBadgeDot}  style={{ background: a.slotColor }} />
            <span className={styles.attackBadgeSlot} style={{ color: a.slotColor }}>{a.slotLabel}</span>
            <span className={styles.attackBadgeMove}>{a.moveName}</span>
            <span
              className={styles.attackBadgeType}
              style={{
                background: typeColor + '30',
                color: typeColor,
                border: `1px solid ${typeColor}55`,
              }}
            >
              {a.moveType}
            </span>
            {effInfo ? (
              <span
                className={styles.attackBadgeEff}
                style={{
                  color:      effInfo.color,
                  background: effInfo.color + '18',
                  border:     `1px solid ${effInfo.color}44`,
                  padding:    '1px 5px',
                  borderRadius: '5px',
                  fontWeight: 900,
                }}
              >
                {effInfo.text}
              </span>
            ) : (
              <span className={styles.attackBadgeEffNeutral}>عادي</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  FighterCard — the card itself (no badge rendering inside)
// ─────────────────────────────────────────────────────────────────
export function FighterCard({
  member, isPlayer, isActive, fieldPos,
  onSwap, onCancelSwap, pendingSwap,
  isTarget, onTarget,
}) {
  const imgRef  = useRef(null);
  const [animCls, setAnimCls] = useState('');
  const [floats,  setFloats]  = useState([]);

  useEffect(() => {
    if (imgRef.current && member?.poke)
      loadSpriteWithFallback(imgRef.current, member.poke.id, member.poke.name);
  }, [member?.poke?.id]);

  // ── Battle animation events ─────────────────────────────────────────────
  useEffect(() => {
    return subscribeBattleAnim(({ type, fieldPos: fp, isEnemy: ie, damage, mult, crit }) => {
      const cardIsEnemy = !isPlayer;
      if (ie !== cardIsEnemy) return;
      if (fp !== fieldPos)   return;

      // Sprite animation
      const cls = type === 'attack'   ? styles.sprAttack
                : type === 'superEff' ? styles.sprSuperEff
                : type === 'hit'      ? styles.sprHit
                : type === 'heal'     ? styles.sprHeal : '';
      if (cls) {
        setAnimCls(cls);
        setTimeout(() => setAnimCls(''), 620);
      }

      // Floating damage number
      if ((type === 'hit' || type === 'superEff') && damage > 0) {
        const effColor = mult >= 4 ? '#FF1744'
                       : mult >= 2 ? '#FF6B35'
                       : mult <= 0.25 ? '#78909C'
                       : mult <= 0.5  ? '#B0BEC5'
                       : crit         ? '#FFD600'
                       : '#FFFFFF';
        const id = Date.now() + Math.random();
        setFloats(prev => [...prev.slice(-3), { id, damage, color: effColor, isCrit: !!crit }]);
        setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1150);
      }
      if (type === 'heal' && damage > 0) {
        const id = Date.now() + Math.random();
        setFloats(prev => [...prev.slice(-3), { id, damage, color: '#69F0AE', isHeal: true }]);
        setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1100);
      }
    });
  }, [isPlayer, fieldPos]);

  // ── Empty slot ─────────────────────────────────────────────────────────
  if (!member) {
    return (
      <div className={`${styles.card} ${styles.empty} ${isPlayer ? styles.player : styles.enemy}`}>
        <span className={styles.emptyIcon}>○</span>
      </div>
    );
  }

  const { poke, hp, ult = 0, fainted, statuses = {}, stages = {} } = member;
  const statusKeys  = Object.keys(statuses).filter(k => statuses[k]);
  const stagesPairs = Object.entries(stages).filter(([, v]) => v !== 0);
  const ability     = getPokeAbility(poke.id);
  const hpPct       = Math.max(0, Math.round((hp / poke.hp) * 100));
  const hpColor     = hpPct > 50 ? '#81C784' : hpPct > 25 ? '#FFD600' : '#EF5350';

  return (
    <div
      className={[
        styles.card,
        isPlayer    ? styles.player : styles.enemy,
        fainted     ? styles.fainted : '',
        isActive    ? styles.active  : '',
        isTarget    ? styles.target  : '',
        pendingSwap ? styles.pendingSwap : '',
      ].filter(Boolean).join(' ')}
      onClick={isTarget && onTarget ? onTarget : undefined}
      style={{ cursor: isTarget && onTarget ? 'pointer' : 'default' }}
    >
      {/* Floating damage numbers — inside card but z-index above content */}
      {floats.map(f => (
        <DmgFloat key={f.id} id={f.id}
          damage={f.damage} color={f.color}
          isCrit={f.isCrit} isHeal={f.isHeal}
        />
      ))}

      {/* Target overlay */}
      {isTarget && (
        <div className={styles.targetOverlay}>
          <span>🎯</span>
          <span className={styles.targetTxt}>اختر هدفاً</span>
        </div>
      )}

      {/* Pending swap badge */}
      {pendingSwap && (
        <div className={styles.pendingSwapBadge}>
          🔄 → {pendingSwap}
        </div>
      )}

      {/* Sprite */}
      <div className={styles.spriteWrap}>
        <img ref={imgRef} alt={poke.name}
          className={`${styles.sprite} ${fainted ? styles.sprFainted : ''} ${animCls}`} />
      </div>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{poke.name}</span>
          {isActive && !fainted && <span className={styles.activeDot} />}
        </div>

        <div className={styles.hpRow}>
          <span style={{ color: hpColor, fontWeight: 700, fontSize: 10 }}>
            {hp}<span style={{ color: 'rgba(255,255,255,.35)', fontWeight: 400 }}>/{poke.hp}</span>
          </span>
          <span className={styles.hpPct} style={{ color: hpColor }}>({hpPct}%)</span>
        </div>
        <HPBar current={hp} max={poke.hp} />

        <div className={styles.ultRow}>
          <span className={styles.ultLabel}>ULT</span>
          <div className={styles.ultTrack}>
            <div className={`${styles.ultFill} ${ult >= 100 ? styles.ultReady : ''}`}
              style={{ width: ult + '%' }} />
          </div>
          <span className={`${styles.ultVal} ${ult >= 100 ? styles.ultReadyTxt : ''}`}>
            {ult >= 100 ? '✦' : ult + '%'}
          </span>
        </div>

        {ability && (
          <div className={styles.abilityRow}>
            <span className={styles.abilityIcon}>{ability.icon}</span>
            <span className={styles.abilityName}>{ability.name}</span>
          </div>
        )}

        {(statusKeys.length > 0 || stagesPairs.length > 0) && (
          <div className={styles.badges}>
            {statusKeys.map(k => {
              const c = STATUS_CFG[k];
              return c ? (
                <span key={k} className={styles.statusBadge} style={{ background: c.bg, color: c.fg }}>
                  {c.icon} {c.label}
                </span>
              ) : null;
            })}
            {stagesPairs.map(([stat, v]) => (
              <span key={stat} className={`${styles.stageBadge} ${v > 0 ? styles.stPos : styles.stNeg}`}>
                {STAT_AR?.[stat] ?? stat}{v > 0 ? '+' + v : v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Swap / cancel buttons */}
      {onSwap && !fainted && !pendingSwap && (
        <button className={styles.swapBtn} onClick={e => { e.stopPropagation(); onSwap(); }}
          title="تبديل البوكيمون">🔄</button>
      )}
      {onCancelSwap && pendingSwap && (
        <button className={styles.cancelSwapBtn} onClick={e => { e.stopPropagation(); onCancelSwap(); }}
          title="إلغاء التبديل">✕</button>
      )}
    </div>
  );
}