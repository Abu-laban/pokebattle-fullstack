// WeatherBar — weather display with particles, position="top" = inside arena header
import { useEffect, useRef } from 'react';
import { useBattleStore }    from '../../store/battleStore.js';
import { WEATHER_INFO }      from '../../engine/Weather.js';
import styles                from './WeatherBar.module.css';

export function WeatherBar({ position = 'normal' }) {
  const weather      = useBattleStore(s => s.weather);
  const particlesRef = useRef(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    container.innerHTML = '';
    if (!weather.type) return;

    const count = { RAIN:35, SAND:22, HAIL:22, SUN:15 }[weather.type] ?? 20;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      if (weather.type === 'RAIN') {
        el.style.cssText = `position:absolute;width:${1+Math.random()}px;height:${10+Math.random()*10}px;
          background:linear-gradient(180deg,transparent,rgba(79,195,247,.8));border-radius:2px;
          left:${Math.random()*100}%;top:-20px;
          animation:rainDrop ${.5+Math.random()*.5}s linear ${Math.random()*2}s infinite;`;
      } else if (weather.type === 'SAND') {
        el.style.cssText = `position:absolute;width:${2+Math.random()*3}px;height:${2+Math.random()*3}px;
          background:rgba(255,183,77,.6);border-radius:50%;
          left:-10px;top:${Math.random()*100}%;
          animation:sandDrift ${1+Math.random()*1.5}s linear ${Math.random()*2}s infinite;`;
      } else if (weather.type === 'HAIL') {
        el.style.cssText = `position:absolute;font-size:${3+Math.random()*4}px;
          left:${Math.random()*100}%;top:-20px;color:rgba(128,222,234,.9);
          animation:snowFall ${1+Math.random()*1.2}s linear ${Math.random()*2}s infinite;`;
        el.textContent = '❄';
      } else if (weather.type === 'SUN') {
        el.style.cssText = `position:absolute;width:${3+Math.random()*4}px;height:1px;
          background:rgba(255,214,0,.4);border-radius:2px;
          left:${Math.random()*110}%;top:${Math.random()*100}%;
          animation:sunRay ${1.5+Math.random()*2}s ease-in-out ${Math.random()*3}s infinite alternate;`;
      }
      container.appendChild(el);
    }
  }, [weather.type]);

  if (!weather.type) return null;
  const w = WEATHER_INFO[weather.type];

  return (
    <div className={`${styles.bar} ${styles[weather.type?.toLowerCase()] ?? ''} ${position==='top'?styles.topPos:''}`}
      style={{ background:w.bg, borderColor:w.borderColor }}>
      <div ref={particlesRef} className={styles.particles} aria-hidden />
      <span className={styles.icon}>{w.icon}</span>
      <div className={styles.info}>
        <span className={styles.name} style={{ color:w.color }}>{w.name}</span>
        <span className={styles.effect}>{w.desc ?? ''}</span>
      </div>
      <div className={styles.turns}>
        <span className={styles.turnsNum}>{weather.turns}</span>
        <span className={styles.turnsTxt}>دور</span>
      </div>
    </div>
  );
}
