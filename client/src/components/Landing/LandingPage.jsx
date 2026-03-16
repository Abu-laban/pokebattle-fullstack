import { useState, useEffect, useRef } from 'react';
import { useAuthStore }  from '../../store/authStore.js';
import { AuthScreen }    from '../Auth/AuthScreen.jsx';
import styles            from './LandingPage.module.css';

// 20 unique pokémon — 2× duplicated in JSX for seamless loop
const POKES = [
  { id: 6,   name: 'CHARIZARD',  type: 'FIRE',     color: '#FF6B35' },
  { id: 150, name: 'MEWTWO',     type: 'PSYCHIC',  color: '#EC407A' },
  { id: 249, name: 'LUGIA',      type: 'FLYING',   color: '#4FC3F7' },
  { id: 384, name: 'RAYQUAZA',   type: 'DRAGON',   color: '#5C6BC0' },
  { id: 25,  name: 'PIKACHU',    type: 'ELECTRIC', color: '#FFD600' },
  { id: 245, name: 'SUICUNE',    type: 'WATER',    color: '#29B6F6' },
  { id: 3,   name: 'VENUSAUR',   type: 'GRASS',    color: '#66BB6A' },
  { id: 9,   name: 'BLASTOISE',  type: 'WATER',    color: '#1E88E5' },
  { id: 94,  name: 'GENGAR',     type: 'GHOST',    color: '#7E57C2' },
  { id: 130, name: 'GYARADOS',   type: 'WATER',    color: '#1565C0' },
  { id: 143, name: 'SNORLAX',    type: 'NORMAL',   color: '#78909C' },
  { id: 248, name: 'TYRANITAR',  type: 'DARK',     color: '#546E7A' },
  { id: 250, name: 'HO-OH',      type: 'FIRE',     color: '#FF8F00' },
  { id: 282, name: 'GARDEVOIR',  type: 'PSYCHIC',  color: '#F48FB1' },
  { id: 373, name: 'SALAMENCE',  type: 'DRAGON',   color: '#42A5F5' },
  { id: 376, name: 'METAGROSS',  type: 'STEEL',    color: '#90A4AE' },
  { id: 445, name: 'GARCHOMP',   type: 'DRAGON',   color: '#EF6C00' },
  { id: 448, name: 'LUCARIO',    type: 'FIGHTING', color: '#1976D2' },
  { id: 487, name: 'GIRATINA',   type: 'GHOST',    color: '#4A148C' },
  { id: 643, name: 'RESHIRAM',   type: 'DRAGON',   color: '#E3F2FD' },
  { id: 149, name: 'DRAGONITE',  type: 'DRAGON',   color: '#FF9800' },
  { id: 131, name: 'LAPRAS',     type: 'WATER',    color: '#4DD0E1' },
  { id: 196, name: 'ESPEON',     type: 'PSYCHIC',  color: '#CE93D8' },
  { id: 197, name: 'UMBREON',    type: 'DARK',     color: '#FDD835' },
  { id: 244, name: 'ENTEI',      type: 'FIRE',     color: '#FF7043' },
  { id: 243, name: 'RAIKOU',     type: 'ELECTRIC', color: '#FFCA28' },
  { id: 254, name: 'SCEPTILE',   type: 'GRASS',    color: '#43A047' },
  { id: 257, name: 'BLAZIKEN',   type: 'FIRE',     color: '#E64A19' },
  { id: 260, name: 'SWAMPERT',   type: 'WATER',    color: '#1565C0' },
  { id: 350, name: 'MILOTIC',    type: 'WATER',    color: '#80DEEA' },
  { id: 380, name: 'LATIAS',     type: 'DRAGON',   color: '#EF5350' },
  { id: 381, name: 'LATIOS',     type: 'DRAGON',   color: '#42A5F5' },
  { id: 395, name: 'EMPOLEON',   type: 'WATER',    color: '#1A237E' },
  { id: 398, name: 'STARAPTOR',  type: 'FLYING',   color: '#757575' },
  { id: 407, name: 'ROSERADE',   type: 'GRASS',    color: '#E91E63' },
  { id: 430, name: 'HONCHKROW',  type: 'DARK',     color: '#37474F' },
  { id: 472, name: 'GLISCOR',    type: 'FLYING',   color: '#B71C1C' },
  { id: 491, name: 'DARKRAI',    type: 'DARK',     color: '#212121' },
  { id: 637, name: 'VOLCARONA',  type: 'FIRE',     color: '#FF6D00' },
  { id: 644, name: 'ZEKROM',     type: 'DRAGON',   color: '#546E7A' },
];

// Duplicate for seamless loop handled inside Carousel component

function Card({ poke }) {
  const imgRef  = useRef(null);
  const tried   = useRef(0);
  const sources = [
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${poke.id}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.id}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png`,
  ];

  const handleError = () => {
    tried.current++;
    if (tried.current < sources.length && imgRef.current) {
      imgRef.current.src = sources[tried.current];
    }
  };

  return (
    <div className={styles.card} style={{ '--c': poke.color }}>
      <div className={styles.halo} />
      <div className={styles.spriteBox}>
        <img ref={imgRef} src={sources[0]} alt={poke.name} onError={handleError} />
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.cardName}>{poke.name}</span>
        <span className={styles.cardType}>{poke.type}</span>
      </div>
    </div>
  );
}

function Carousel() {
  const CARD_W = 144; // 130px card + 14px margin
  const COUNT  = POKES.length; // 40 pokémon
  const SET_W  = COUNT * CARD_W;
  const SPEED  = 0.35; // slow and smooth

  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const x1   = useRef(0);
  const x2   = useRef(SET_W); // second set starts right after first
  const raf  = useRef(null);

  useEffect(() => {
    const tick = () => {
      x1.current -= SPEED;
      x2.current -= SPEED;

      // When a set fully exits left → teleport it to the right of the other set
      if (x1.current + SET_W <= 0) x1.current = x2.current + SET_W;
      if (x2.current + SET_W <= 0) x2.current = x1.current + SET_W;

      if (ref1.current) ref1.current.style.transform = `translateX(${x1.current}px)`;
      if (ref2.current) ref2.current.style.transform = `translateX(${x2.current}px)`;

      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div className={styles.showcase}>
      <div className={styles.carouselWrap}>
        <div className={styles.track} ref={ref1}>
          {POKES.map((p, i) => <Card key={`a${i}`} poke={p} />)}
        </div>
        <div className={styles.track} ref={ref2}>
          {POKES.map((p, i) => <Card key={`b${i}`} poke={p} />)}
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className={styles.page}>
      <div className={styles.grid} />
      <div className={styles.scanline} />

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.badge}>⚡ الموسم الأول</div>
        <h1 className={styles.logo}>
          <span className={styles.logoPoké}>Poké</span>
          <span className={styles.logoBattle}>Battle</span>
        </h1>
        <p className={styles.tagline}>العب · قاتل · تطور</p>
        <p className={styles.sub}>894 بوكيمون · جنرالات I–VII · معارك 2v2 · برج المعارك</p>
        <div className={styles.actions}>
          <button className={styles.ctaBtn} onClick={() => setShowAuth(true)}>
            <span className={styles.ctaIcon}>⚔️</span>
            ابدأ المغامرة
          </button>
        </div>
        <div className={styles.stats}>
          <div className={styles.statItem}><span className={styles.statNum}>894</span><span className={styles.statLabel}>بوكيمون</span></div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}><span className={styles.statNum}>7</span><span className={styles.statLabel}>أجيال</span></div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}><span className={styles.statNum}>2v2</span><span className={styles.statLabel}>معارك</span></div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}><span className={styles.statNum}>18</span><span className={styles.statLabel}>نوع</span></div>
        </div>
      </div>

      {/* Infinite carousel */}
      <Carousel />

      {/* Features */}
      <div className={styles.features}>
        <div className={styles.feature}><span className={styles.featureIcon}>⚔️</span><h3>معارك 2v2</h3><p>قاتل بفريق من 4 بوكيمون في معارك استراتيجية</p></div>
        <div className={styles.feature}><span className={styles.featureIcon}>🏰</span><h3>برج المعارك</h3><p>تسلق البرج وواجه خصوماً أقوى مع كل انتصار</p></div>
        <div className={styles.feature}><span className={styles.featureIcon}>🔓</span><h3>نظام الفتح</h3><p>افتح بوكيمون جديدة بإتقان من تمتلكه</p></div>
        <div className={styles.feature}><span className={styles.featureIcon}>🏆</span><h3>لوحة المتصدرين</h3><p>تنافس مع لاعبين آخرين واصعد إلى القمة</p></div>
      </div>

      {showAuth && <AuthScreen onClose={() => setShowAuth(false)} />}
    </div>
  );
}