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
        <header style={{ textAlign:'center', padding:'16px 0 10px', position:'relative' }}>
          <h1 style={{
            fontFamily:"'Press Start 2P',monospace",
            fontSize:'clamp(13px,3vw,20px)',
            background:'linear-gradient(135deg,#FFD600,#FF6B35,#EC407A)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            letterSpacing:'3px', filter:'drop-shadow(0 0 20px rgba(255,107,53,.4))',
          }}>PokéBattle</h1>
          <p style={{ fontSize:'10px',color:'rgba(255,255,255,.35)',marginTop:'5px',letterSpacing:'3px' }}>
            ARENA · GEN I–VII
          </p>

          {/* Auth + Leaderboard nav */}
          <div style={{ position:'absolute', top:16, right:0, display:'flex', gap:8 }}>
            <button
              onClick={() => setScreen('leaderboard')}
              style={navBtn}
              title="لوحة المتصدرين"
            >🏆</button>
            {user ? (
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>
                  {user.username}
                </span>
                <button onClick={logout} style={navBtn} title="خروج">🚪</button>
              </div>
            ) : (
              <button onClick={() => setScreen('auth')} style={navBtn} title="تسجيل الدخول">
                👤
              </button>
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

const navBtn = {
  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 10, padding: '6px 10px', cursor: 'pointer',
  fontSize: 14, transition: 'all .2s',
};
