// ══════════════════════════════════════════
// Sprite / Image Loading Engine
// ══════════════════════════════════════════
import { FORM_SD_NAMES, FORM_API_IDS } from '../data/spriteData.js';

// ── Convert Pokémon name to Showdown sprite slug ──
export function nameToSD(name, id) {
  if (!name) return 'missingno';
  // Check by ID first (covers megas, forms, regional variants)
  if (id && FORM_SD_NAMES[id]) return FORM_SD_NAMES[id];
  return name
    .toLowerCase()
    .replace(/[éè]/g, 'e')
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Sprite URL generators ──
export function showdownGif(name, id) {
  const slug = nameToSD(name, id);
  return `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`;
}

export function showdownStatic(name, id) {
  const slug = nameToSD(name, id);
  return `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
}

export function pokeApiSprite(id) {
  const apiId = FORM_API_IDS[id] || id;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${apiId}.png`;
}

export function pokeApiAnimated(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// ── Build fallback chain for a Pokémon sprite ──
// Returns an array of URLs to try in order
export function getSpriteChain(id, name) {
  return [
    showdownGif(name, id),
    showdownStatic(name, id),
    pokeApiAnimated(id),
    pokeApiSprite(id),
    `https://play.pokemonshowdown.com/sprites/gen5/${id}.png`,
    `https://play.pokemonshowdown.com/sprites/gen5/0.png`,
  ];
}

// ── React-friendly hook helper (use in PokeSprite component) ──
export function loadSpriteWithFallback(img, id, name) {
  if (!img) return;
  const chain = getSpriteChain(id, name);
  let idx = 0;

  function tryNext() {
    if (idx >= chain.length) {
      img.src = '';
      img.style.opacity = '0.3';
      return;
    }
    img.src = chain[idx++];
  }

  img.onload  = () => { img.style.opacity = '1'; };
  img.onerror = tryNext;
  tryNext();
}
