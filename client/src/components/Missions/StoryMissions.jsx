import { useState, useMemo }  from 'react';
import { createPortal }       from 'react-dom';
import { useMissionStore }    from '../../store/missionStore.js';
import { useProgressStore, getTrainerRank } from '../../store/progressStore.js';
import { useAuthStore }       from '../../store/authStore.js';
import { MISSIONS, CHAPTER_LABELS, MISSION_TYPE_COLORS } from '../../data/missionData.js';
import styles                 from './StoryMissions.module.css';

const RANK_ORDER = ['beginner','novice','adept','expert','master','legendary'];
const RANK_LABELS = {
  beginner:'🎓 متدرب', novice:'🌟 مبتدئ', adept:'🔥 ماهر',
  expert:'⚡ خبير',   master:'🏆 سيد',    legendary:'👑 أسطورة',
};

export function StoryMissions({ onClose }) {
  const [chapter, setChapter] = useState('all');
  const [filter,  setFilter]  = useState('all'); // all | active | done

  const { user }   = useAuthStore();
  const progress   = useProgressStore();
  const missions   = useMissionStore();

  const level     = user?.level ?? progress.level ?? 1;
  const rankInfo  = getTrainerRank(level);
  const curRankI  = RANK_ORDER.indexOf(rankInfo.rank);

  const chapters = [...new Set(MISSIONS.map(m => m.chapter))].sort();

  const items = useMemo(() => {
    let list = MISSIONS;
    if (chapter !== 'all') list = list.filter(m => m.chapter === Number(chapter));
    if (filter === 'done')   list = list.filter(m =>  missions.completed.includes(m.id));
    if (filter === 'active') list = list.filter(m => !missions.completed.includes(m.id));
    return list;
  }, [chapter, filter, missions.completed]);

  const totalDone = MISSIONS.filter(m => missions.completed.includes(m.id)).length;
  const pctDone   = Math.round((totalDone / MISSIONS.length) * 100);

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>📜 مهام القصة</h2>
            <div className={styles.summary}>
              <span style={{color:'#66BB6A'}}>✅ {totalDone} مكتمل</span>
              <span style={{color:'rgba(255,255,255,.4)'}}>من {MISSIONS.length} مهمة</span>
              <span style={{color:'#FFD600'}}>رتبتك: {rankInfo.label}</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Global progress */}
        <div className={styles.globalBar}>
          <div className={styles.globalFill} style={{width:`${pctDone}%`}} />
        </div>
        <div className={styles.pctLabel}>{pctDone}% مكتمل</div>

        {/* Chapter tabs */}
        <div className={styles.chapters}>
          <button className={`${styles.chapBtn} ${chapter==='all'?styles.chapActive:''}`}
            onClick={()=>setChapter('all')}>الكل</button>
          {chapters.map(c => (
            <button key={c}
              className={`${styles.chapBtn} ${chapter===String(c)?styles.chapActive:''}`}
              onClick={()=>setChapter(String(c))}>
              {CHAPTER_LABELS[c]}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className={styles.filters}>
          {[{k:'all',l:'الكل'},{k:'active',l:'🔄 جارية'},{k:'done',l:'✅ مكتملة'}].map(f=>(
            <button key={f.k}
              className={`${styles.filterBtn} ${filter===f.k?styles.filterActive:''}`}
              onClick={()=>setFilter(f.k)}>{f.l}</button>
          ))}
        </div>

        {/* Mission list */}
        <div className={styles.list}>
          {items.map(mission => {
            const isDone    = missions.completed.includes(mission.id);
            const mProg     = missions.getMissionProgress(mission.id);
            const reqRankI  = RANK_ORDER.indexOf(mission.reqRank);
            const locked    = curRankI < reqRankI;
            const typeColor = MISSION_TYPE_COLORS[mission.type] || '#4FC3F7';

            return (
              <div key={mission.id}
                className={`${styles.missionRow} ${isDone?styles.done:''} ${locked?styles.locked:''}`}>

                {/* Reward XP */}
                <div className={styles.rewardSprite}>
                  <div className={styles.xpBadge}>+{mission.reward.xp}<br/>XP</div>
                </div>

                {/* Info */}
                <div className={styles.mInfo}>
                  <div className={styles.mTitleRow}>
                    <span className={styles.mName}>{mission.name}</span>
                    <span className={styles.typeTag} style={{color:typeColor,borderColor:typeColor+'44',background:typeColor+'15'}}>
                      {mission.type === 'legendary' ? '👑 أسطوري' : '📜 قصة'}
                    </span>
                    {locked && (
                      <span className={styles.lockTag}>🔐 {RANK_LABELS[mission.reqRank]}</span>
                    )}
                    {isDone && <span className={styles.doneBadge}>✅ مكتمل</span>}
                  </div>

                  {/* Reward line */}
                  <div className={styles.rewardLine}>
                    🎁 المكافأة: <strong>+{mission.reward.xp} XP</strong>
                  </div>

                  {/* Goals */}
                  {!isDone && !locked && (
                    <div className={styles.goals}>
                      {mProg?.goals.map((goal, gi) => (
                        <div key={gi} className={`${styles.goal} ${goal.done?styles.goalDone:''}`}>
                          <span className={styles.goalIcon}>{goal.done?'✅':'⭕'}</span>
                          <span className={styles.goalText}>{goal.label}</span>
                          {!goal.done && goal.count > 1 && (
                            <div className={styles.goalProg}>
                              <div className={styles.goalBar}>
                                <div className={styles.goalFill}
                                  style={{width:`${Math.round((goal.current/goal.count)*100)}%`}}/>
                              </div>
                              <span className={styles.goalCount}>{goal.current}/{goal.count}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {locked && (
                    <div className={styles.lockedMsg}>
                      ابلغ رتبة {RANK_LABELS[mission.reqRank]} لفتح هذه المهمة
                    </div>
                  )}

                  {isDone && (
                    <div className={styles.doneMsg}>تم إكمال هذه المهمة والحصول على المكافأة 🏆</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>,
    document.body
  );
}