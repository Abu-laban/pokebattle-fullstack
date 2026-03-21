import { useEffect, useState }         from 'react';
import { useBattleStore }    from './store/battleStore.js';
import { useAuthStore }      from './store/authStore.js';
import { WEATHER_INFO }      from './engine/Weather.js';
import { SFX }               from './engine/audio.js';
import { DEX }               from './data/dex.js';
import { SelectionScreen }   from './components/Selection/SelectionScreen.jsx';
import { BattleScreen }      from './components/Battle/BattleScreen.jsx';
import { TowerScreen }       from './components/Tower/TowerScreen.jsx';
import { AuthScreen }        from './components/Auth/AuthScreen.jsx';
import { ProfileScreen }     from './components/Profile/ProfileScreen.jsx';
import { MissionsScreen }    from './components/Missions/MissionsScreen.jsx';
import { StoryMissions }     from './components/Missions/StoryMissions.jsx';
import { LandingPage }       from './components/Landing/LandingPage.jsx';
import { LeaderboardScreen } from './components/Leaderboard/LeaderboardScreen.jsx';
import { ResultOverlay }      from './components/Overlays/ResultOverlay.jsx';
import { EvolutionOverlay }    from './components/Overlays/EvolutionOverlay.jsx';
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
  const screen    = useBattleStore(s => s.screen);
  const weather   = useBattleStore(s => s.weather);
  const setScreen = useBattleStore(s => s.setScreen);
  const { user, restoreSession, logout } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const NOTIF_TTL_MS = 2500;

  // ── SEC-01 FIX ─────────────────────────────────────────────────────────────
  // The JWT is NO LONGER read from the URL query string.
  // After email verification the server sets an HttpOnly cookie and redirects
  // to /?verified=true. We detect that flag, restore the session via the
  // cookie (restoreSession → GET /api/auth/me), then clear the URL.
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const isVerified  = params.get('verified') === 'true';
    const oauthError  = params.get('error');

    if (oauthError) window.history.replaceState({}, '', '/');

    // Always restore the session from the HttpOnly cookie
    restoreSession().finally(() => {
      setSessionChecked(true);

      // Show success notification after a successful email verification
      if (isVerified) {
        window.history.replaceState({}, '', '/');
        const now = Date.now();
        setNotifications(prev => [...prev, {
          id: now,
          createdAt: now,
          text: '✅ تم تفعيل حسابك بنجاح! أهلاً بك في PokéBattle.',
        }]);
      }
    });
  }, []);

  useEffect(() => {
    document.body.classList.remove('weather-sun','weather-rain','weather-sand','weather-hail');
    if (weather.type) document.body.classList.add(WEATHER_INFO[weather.type]?.bodyClass ?? '');
  }, [weather.type]);

  useEffect(() => {
    const t = setTimeout(() => SFX.playSelectBGM(), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const unlockHandler = (e) => {
      const { id } = e.detail;
      const poke = DEX.find(p => p.id === id);
      if (poke) {
        const now = Date.now();
        const notif = { id: now + Math.random(), createdAt: now, text: `🔓 ${poke.name} مفتوح الآن!` };
        setNotifications(prev => [...prev, notif].slice(-6));
      }
    };
    window.addEventListener('poke-unlocked', unlockHandler);
    return () => window.removeEventListener('poke-unlocked', unlockHandler);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - NOTIF_TTL_MS;
      setNotifications(prev => prev.filter(n => (n.createdAt ?? 0) > cutoff));
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <Stars />

      {/* Loading */}
      {!sessionChecked && (
        <div style={{ position:'fixed', inset:0, background:'#050b18', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ fontFamily:"'Press Start 2P',monospace", color:'#4FC3F7', fontSize:14 }}>
            ⚡ جاري التحميل...
          </div>
        </div>
      )}

      {/* Landing page when not logged in */}
      {sessionChecked && !user && <LandingPage />}

      {/* Game when logged in */}
      {sessionChecked && user && (<>
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          {notifications.map(n => (
            <div key={n.id} style={{
              background: 'rgba(0,0,0,0.8)', color: '#FFD600', padding: '10px 15px',
              borderRadius: '8px', marginBottom: '10px', fontFamily: "'Cairo', sans-serif",
              boxShadow: '0 0 10px rgba(255,214,0,0.5)', animation: 'fadeIn 0.5s'
            }}>{n.text}</div>
          ))}
        </div>
        <div className="app-wrap">
          <header style={headerStyle}>
            <div style={headerCenter}>
              <h1 style={h1Style}>PokéBattle</h1>
              <p style={subStyle}>ARENA · GEN I–VII</p>
            </div>
            <div style={navRow}>
              <button onClick={() => setScreen('leaderboard')} style={navBtn} title="لوحة المتصدرين">🏆</button>
              <button
                onClick={() => setScreen('missions')}
                style={{ ...navBtn, padding:'6px 10px', borderRadius:10, background:'rgba(255,214,0,.10)', border:'1px solid rgba(255,214,0,.25)', color:'#FFD600', fontFamily:"'Cairo',sans-serif", fontSize:13, fontWeight:700, cursor:'pointer' }}
                title="مهام فتح البوكيمون"
              >📋</button>
              <button
                onClick={() => setScreen('story-missions')}
                style={{ ...navBtn, padding:'6px 10px', borderRadius:10, background:'rgba(255,152,0,.10)', border:'1px solid rgba(255,152,0,.25)', color:'#FF9800', fontFamily:"'Cairo',sans-serif", fontSize:13, fontWeight:700, cursor:'pointer' }}
                title="مهام القصة"
              >📜</button>
              <button
                onClick={() => setScreen('profile')}
                style={{ ...navBtn, display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:10, background:'rgba(79,195,247,.12)', border:'1px solid rgba(79,195,247,.25)', color:'#4FC3F7', fontFamily:"'Cairo',sans-serif", fontSize:13, fontWeight:700, cursor:'pointer' }}
                title="البروفايل"
              >
                {user.avatar
                  ? <img src={user.avatar} alt="" style={{ width:22, height:22, borderRadius:'50%', objectFit:'cover' }} />
                  : <span style={{ fontSize:16 }}>👤</span>
                }
                {user.username}
              </button>
              <button
                onClick={async () => { await logout(); setScreen('selection'); }}
                style={{ ...navBtn, padding:'6px 10px', borderRadius:10, background:'rgba(239,83,80,.10)', border:'1px solid rgba(239,83,80,.25)', color:'#EF9A9A', fontFamily:"'Cairo',sans-serif", fontSize:13, fontWeight:700, cursor:'pointer' }}
                title="تسجيل الخروج"
              >🚪</button>
            </div>
          </header>

          {screen === 'auth'          && <AuthScreen onClose={() => setScreen('selection')} />}
          {screen === 'profile'       && <ProfileScreen onClose={() => setScreen('selection')} />}
          {screen === 'missions'      && <MissionsScreen onClose={() => setScreen('selection')} />}
          {screen === 'story-missions'&& <StoryMissions  onClose={() => setScreen('selection')} />}
          {screen === 'leaderboard'   && <LeaderboardScreen onBack={() => setScreen('selection')} />}
          {screen === 'selection'   && <SelectionScreen />}
          {screen === 'battle'      && <BattleScreen />}
          {screen === 'tower-pick'  && <TowerScreen />}
        </div>
        <ResultOverlay />
        <EvolutionOverlay />
      </>)}
    </>
  );
}

const headerStyle = { display:'flex', alignItems:'center', padding:'12px 20px 8px', borderBottom:'1px solid rgba(255,255,255,.06)', marginBottom:16, position:'relative', zIndex:10 };
const headerCenter = { position:'absolute', left:'50%', transform:'translateX(-50%)', textAlign:'center' };
const h1Style = { fontFamily:"'Press Start 2P',monospace", fontSize:'clamp(14px,2.5vw,20px)', color:'#FFD600', margin:0, letterSpacing:2, textShadow:'0 0 20px rgba(255,214,0,.4)' };
const subStyle = { fontFamily:"'Cairo',sans-serif", fontSize:10, color:'rgba(255,255,255,.3)', margin:'3px 0 0', letterSpacing:3 };
const navRow   = { display:'flex', gap:8, alignItems:'center', marginLeft:'auto' };
const navBtn   = { background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:11, padding:'8px 12px', cursor:'pointer', fontSize:15, transition:'all .2s', color:'rgba(255,255,255,.75)' };
