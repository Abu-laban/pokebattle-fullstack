// FighterCard — combatant HUD with swap + target interaction
import { useRef, useEffect } from 'react';
import { HPBar }                 from '../UI/HPBar.jsx';
import { loadSpriteWithFallback } from '../../engine/sprites.js';
import { STAT_AR }               from '../../engine/status.js';
import { getPokeAbility }        from '../../data/abilities.js';
import { getPokeClass }          from '../../engine/damage.js';
import { POKE_STATS }            from '../../data/pokeStats.js';
import styles                    from './FighterCard.module.css';

const STATUS_CFG = {
  SLP: { icon:'😴', label:'نائم',   bg:'#6A1FA0', fg:'#E1BEE7' },
  PAR: { icon:'⚡', label:'مشلول', bg:'#F9A825', fg:'#1A1A1A' },
  BRN: { icon:'🔥', label:'محترق', bg:'#BF360C', fg:'#FFCCBC' },
  PSN: { icon:'☠', label:'مسموم', bg:'#4A148C', fg:'#CE93D8' },
  FRZ: { icon:'❄', label:'مجمّد', bg:'#006064', fg:'#80DEEA' },
  CNF: { icon:'😵', label:'مرتبك', bg:'#E65100', fg:'#FFE0B2' },
};

export function FighterCard({ member, isPlayer, isActive, onSwap, isTarget, onTarget }) {
  const imgRef = useRef(null);

  useEffect(() => {
    if (imgRef.current && member?.poke) {
      loadSpriteWithFallback(imgRef.current, member.poke.id, member.poke.name);
    }
  }, [member?.poke?.id]);

  if (!member) {
    return (
      <div className={`${styles.card} ${styles.empty} ${isPlayer ? styles.player : styles.enemy}`}>
        <span className={styles.emptyIcon}>⊘</span>
        <span className={styles.emptyTxt}>فارغ</span>
      </div>
    );
  }

  const { poke, hp, ult, fainted, statuses = {}, stages = {} } = member;
  const statusKeys  = Object.keys(statuses);
  const stagesPairs = Object.entries(stages).filter(([, v]) => v !== 0);

  const stats     = POKE_STATS[poke.id];
  const pokeClass = stats ? getPokeClass(poke.id, stats) : null;
  const ability   = getPokeAbility(poke.id);
  const hpPct     = Math.max(0, Math.round((hp / poke.hp) * 100));

  return (
    <div
      className={[styles.card, isPlayer?styles.player:styles.enemy,
        fainted?styles.fainted:'', isActive?styles.active:'', isTarget?styles.target:''].join(' ')}
      onClick={isTarget && onTarget ? onTarget : undefined}
      style={{ cursor: isTarget && onTarget ? 'pointer' : 'default' }}
    >
      {isTarget && <div className={styles.targetRing}>🎯 اضغط للهدف</div>}

      {pokeClass && (
        <div className={styles.classBadge}
          style={{ background:pokeClass.color+'20', borderColor:pokeClass.color+'60', color:pokeClass.color }}>
          {pokeClass.icon} {pokeClass.nameEn}
        </div>
      )}

      <div className={styles.spriteWrap}>
        <img ref={imgRef} alt={poke.name}
          className={`${styles.sprite} ${fainted ? styles.sprFainted : ''}`} />
        {fainted && <div className={styles.faintOverlay}>✕</div>}
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{poke.name}</span>
          {isActive && !fainted && <span className={styles.activeDot} />}
        </div>

        <div className={styles.hpNums}>
          <span style={{ color: hpPct>50?'#81C784':hpPct>25?'#FFD600':'#EF5350', fontWeight:700 }}>
            {hp}
          </span>
          <span className={styles.hpSlash}>/{poke.hp}</span>
          <span className={styles.hpPct}>({hpPct}%)</span>
        </div>

        <HPBar current={hp} max={poke.hp} />

        <div className={styles.ultRow}>
          <span className={styles.ultLabel}>⚡ULT</span>
          <div className={styles.ultTrack}>
            <div className={`${styles.ultFill} ${ult>=100?styles.ultReady:''}`}
              style={{ width:`${ult}%` }} />
          </div>
          <span className={`${styles.ultVal} ${ult>=100?styles.ultReadyTxt:''}`}>
            {ult>=100 ? '✦ جاهز!' : `${ult}%`}
          </span>
        </div>

        {ability && (
          <div className={styles.abilityRow} title={ability.desc}>
            <span className={styles.abilityIcon}>{ability.icon}</span>
            <span className={styles.abilityName}>{ability.name}</span>
          </div>
        )}

        {(statusKeys.length > 0 || stagesPairs.length > 0) && (
          <div className={styles.badges}>
            {statusKeys.map(k => {
              const c = STATUS_CFG[k];
              return c ? (
                <span key={k} className={styles.statusBadge} style={{background:c.bg,color:c.fg}}>
                  {c.icon} {c.label}
                </span>
              ) : null;
            })}
            {stagesPairs.map(([stat,v]) => (
              <span key={stat} className={`${styles.stageBadge} ${v>0?styles.stPos:styles.stNeg}`}>
                {STAT_AR?.[stat]??stat} {v>0?`+${v}`:v}
              </span>
            ))}
          </div>
        )}
      </div>

      {onSwap && !fainted && (
        <button className={styles.swapBtn} onClick={e=>{e.stopPropagation();onSwap();}} title="تبديل">
          🔄
        </button>
      )}
    </div>
  );
}
