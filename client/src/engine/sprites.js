// ══════════════════════════════════════════
// Sprite Engine — Chibi Pokémon sprites
// Primary: Pokémon Showdown animated GIFs (chibi style)
// Fallback chain uses FORM_API_IDS for all mega/form IDs
// ══════════════════════════════════════════
import { FORM_SD_NAMES, FORM_API_IDS } from '../data/spriteData.js';

export function nameToSD(name, id) {
  if (!name) return 'missingno';
  if (id && FORM_SD_NAMES[id]) return FORM_SD_NAMES[id];
  return name
    .toLowerCase()
    .replace(/[éè]/g, 'e')
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function showdownGif(name, id) {
  return `https://play.pokemonshowdown.com/sprites/ani/${nameToSD(name, id)}.gif`;
}

export function showdownStatic(name, id) {
  return `https://play.pokemonshowdown.com/sprites/gen5/${nameToSD(name, id)}.png`;
}

// ── IMPORTANT: always resolve form/mega IDs via FORM_API_IDS ─────────────────
export function pokeApiFront(id) {
  const apiId = FORM_API_IDS[id] || id;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${apiId}.png`;
}

export function pokeApiArt(id) {
  const apiId = FORM_API_IDS[id] || id;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${apiId}.png`;
}

// ── Fallback chain: PokeAPI front → PokeAPI art → SD animated → SD static
export function getSpriteChain(id, name) {
  const slug  = nameToSD(name, id);
  const apiId = FORM_API_IDS[id] || id;
  return [
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${apiId}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${apiId}.png`,
    `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`,
    `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`,
  ];
}

export function loadSpriteWithFallback(img, id, name) {
  if (!img) return;
  const chain = getSpriteChain(id, name);
  let idx = 0;
  img.onload  = () => { img.style.opacity = '1'; console.log('Sprite loaded:', name); };
  img.onerror = () => { 
    console.log('Sprite failed:', chain[idx-1], 'trying next');
    if (idx < chain.length) img.src = chain[idx++]; 
  };
  img.src = chain[idx++];
}
