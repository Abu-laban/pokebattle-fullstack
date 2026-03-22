// ══════════════════════════════════════════
// MatchmakingOverlay — PvP search UI
// Rendered via createPortal to document.body to escape
// any parent stacking context caused by CSS animations.
// ══════════════════════════════════════════
import { useEffect, useState } from 'react';
import { createPortal }        from 'react-dom';
import styles from './MatchmakingOverlay.module.css';

const WAIT_SECS = 15;

export function MatchmakingOverlay({ status, opponent, onCancel, onStartBot }) {
  const [elapsed, setElapsed] = useState(0);
  const [dots,    setDots]    = useState('');

  useEffect(() => {
    if (status !== 'searching') { setElapsed(0); return; }
    setElapsed(0);
    const t = setInterval(() => setElapsed(s => Math.min(s + 1, WAIT_SECS)), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (status !== 'searching') { setDots(''); return; }
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, [status]);

  // Auto-launch handled by SelectionScreen's useEffect — no duplicate timer here

  if (status === 'idle') return null;

  const remaining    = Math.max(0, WAIT_SECS - elapsed);
  const circumference = 2 * Math.PI * 36;
  const ringPct      = (remaining / WAIT_SECS) * 100;

  const content = (
    <div className={styles.overlay}>
      <div className={styles.panel}>

        {/* ── SEARCHING ── */}
        {status === 'searching' && (
          <>
            <div className={styles.countdownWrap}>
              <svg className={styles.countdownSvg} viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="36"
                  fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" />
                <circle cx="44" cy="44" r="36"
                  fill="none"
                  stroke="url(#mmRingGrad)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - ringPct / 100)}
                  transform="rotate(-90 44 44)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <defs>
                  <linearGradient id="mmRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#4FC3F7" />
                    <stop offset="100%" stopColor="#7C4DFF" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={styles.countdownInner}>
                <span className={styles.countdownNum}>{remaining}</span>
                <span className={styles.countdownUnit}>ث</span>
              </div>
            </div>

            <div className={styles.title}>البحث عن خصم{dots}</div>

            <div className={styles.progressBar}>
              <div className={styles.progressFill}
                style={{ width: `${(elapsed / WAIT_SECS) * 100}%` }} />
            </div>

            <div className={styles.hint}>
              إذا لم يُعثر على خصم خلال <strong>{remaining}ث</strong> ستبدأ معركة ضد البوت
            </div>

            <button className={styles.botNowBtn}
              onClick={() => { onCancel?.(); onStartBot?.(); }}>
              🤖 العب ضد البوت الآن
            </button>
            <button className={styles.cancelBtn} onClick={onCancel}>
              ✕ إلغاء البحث
            </button>
          </>
        )}

        {/* ── MATCH FOUND ── */}
        {status === 'found' && opponent && (
          <>
            <div className={styles.foundVs}>
              <span className={styles.vsYou}>أنت</span>
              <span className={styles.vsIcon}>⚔️</span>
              <span className={styles.vsOpponent}>{opponent.name}</span>
            </div>
            <div className={styles.foundTitle}>تم إيجاد خصم!</div>
            <div className={styles.loadingBar}>
              <div className={styles.loadingFill} />
            </div>
            <div className={styles.sub}>جاري تحميل المعركة...</div>
          </>
        )}

        {/* ── TIMEOUT → BOT ── */}
        {status === 'timeout' && (
          <>
            <div className={styles.botIcon}>🤖</div>
            <div className={styles.title}>لم يُعثر على لاعب</div>
            <div className={styles.sub}>جاري بدء المعركة ضد البوت...</div>
            <div className={styles.loadingBar}>
              <div className={styles.loadingFill} />
            </div>
          </>
        )}

      </div>
    </div>
  );

  // Portal to document.body — escapes any parent CSS stacking context
  return createPortal(content, document.body);
}