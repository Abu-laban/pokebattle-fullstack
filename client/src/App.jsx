import { useEffect }         from 'react';
import { useBattleStore }    from './store/battleStore.js';
import { useAuthStore }      from './store/authStore.js';
import { WEATHER_INFO }      from './engine/Weather.js';
import { SFX }               from './engine/audio.js';
import { SelectionScreen }   from './components/Selection/SelectionScreen.jsx';
import { BattleScreen }      from './components/Battle/BattleScreen.jsx';
import { TowerScreen }       from './components/Tower/TowerScreen.jsx';
import { AuthScreen }        from './components/Auth/AuthScreen.jsx';
import { LeaderboardScreen } from './components/Leaderboard/LeaderboardScreen.jsx';
import './styles/globals.css';

function Stars() {
  useEffect(() => {
    const layer = document.getElementById('stars-layer');
    if (!layer || layer.children.length > 0) return;
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('div');
      s.className = 'star';
      const sz = Math.random() * 2.5 + 1;
      s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random()*58}%;left:${Math.random()*100}%;--d:${2+Math.random()*4}s;--delay:${Math.random()*4}s`;
      layer.appendChild(s);
    }
  }, []);
  return <div className="stars-layer" id="stars-layer" />;
}

export default function App() {
  const screen  = useBattleStore(s => s.screen);
  const weather = useBattleStore(s => s.weather);
  const setScreen = useBattleStore(s => s.setScreen);
  const { user, restoreSession, logout } = useAuthStore();

  // Restore JWT session on startup
  useEffect(() => { restoreSession(); }, []);

  useEffect(() => {
    document.body.classList.remove('weather-sun','weather-rain','weather-sand','weather-hail');
    if (weather.type) document.body.classList.add(WEATHER_INFO[weather.type]?.bodyClass ?? '');
  }, [weather.type]);

  useEffect(() => {
    const t = setTimeout(() => SFX.playSelectBGM(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Stars />
      <div className="app-wrap">
        <header style={headerStyle}>
          <div style={headerCenter}>
            <h1 style={h1Style}>PokéBattle</h1>
            <p style={subStyle}>ARENA · GEN I–VII</p>
          </div>
          <div style={navRow}>
            <button onClick={() => setScreen('leaderboard')} style={navBtn} title="لوحة المتصدرين">🏆</button>
            {user ? (
              <>
                <span style={userTag}>{user.username}</span>
                <button onClick={logout} style={navBtn} title="خروج">🚪</button>
              </>
            ) : (
              <button onClick={() => setScreen('auth')} style={navBtn} title="تسجيل الدخول">👤</button>
            )}
          </div>
        </header>

        {screen === 'auth'        && <AuthScreen onClose={() => setScreen('selection')} />}
        {screen === 'leaderboard' && <LeaderboardScreen onBack={() => setScreen('selection')} />}
        {screen === 'selection'   && <SelectionScreen />}
        {screen === 'battle'      && <BattleScreen />}
        {screen === 'tower-pick'  && <TowerScreen />}
      </div>
    </>
  );
}

const headerStyle = {
  display:'flex', alignItems:'center', justifyContent:'space-between',
  padding:'14px 0 12px', position:'relative',
};
const headerCenter = {
  position:'absolute', left:'50%', transform:'translateX(-50%)',
  textAlign:'center', pointerEvents:'none',
};
const h1Style = {
  fontFamily:"'Press Start 2P',monospace",
  fontSize:'clamp(14px,3vw,22px)',
  background:'linear-gradient(135deg,#FFD600 0%,#FF6B35 50%,#EC407A 100%)',
  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
  letterSpacing:'3px',
  filter:'drop-shadow(0 0 24px rgba(255,107,53,.45))',
  lineHeight:1.3,
};
const subStyle = {
  fontSize:'9px', color:'rgba(255,255,255,.3)', marginTop:'6px', letterSpacing:'4px',
};
const navRow = {
  display:'flex', gap:8, alignItems:'center', marginLeft:'auto',
};
const userTag = {
  fontSize:11, color:'rgba(255,255,255,.5)', fontFamily:"'Cairo',sans-serif",
  background:'rgba(255,255,255,.05)', padding:'4px 10px', borderRadius:8,
  border:'1px solid rgba(255,255,255,.08)',
};
const navBtn = {
  background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)',
  borderRadius:11, padding:'8px 12px', cursor:'pointer',
  fontSize:15, transition:'all .2s',
  color:'rgba(255,255,255,.75)',
};
