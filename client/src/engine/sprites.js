// ══════════════════════════════════════════
// Sprite Engine — Chibi Pokemon sprites
// Source: Pokemon Showdown animated sprites (chibi style)
// Fallback chain: SD animated → SD static → PokeAPI official art
// ══════════════════════════════════════════
import { FORM_SD_NAMES, FORM_API_IDS } from '../data/spriteData.js';

// Convert name to Showdown sprite slug
export function nameToSD(name, id) {
  if (!name) return 'missingno';
  // Check by ID first — covers Mega/Alolan/Galarian/Hisuian forms
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

// ── Sprite URL generators ─────────────────────────────────────────────────────

// Showdown animated GIF (chibi) — primary source
export function showdownGif(name, id) {
  const slug = nameToSD(name, id);
  return `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`;
}

// Showdown static chibi sprite (gen5 style)
export function showdownStatic(name, id) {
  const slug = nameToSD(name, id);
  return `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
}

// PokeAPI official artwork (large, correct for Mega/forms via FORM_API_IDS)
export function pokeApiArt(id) {
  const apiId = FORM_API_IDS[id] || id;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${apiId}.png`;
}

// PokeAPI front sprite (small, always works)
export function pokeApiFront(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// ── Fallback chain ─────────────────────────────────────────────────────────────
// Order: SD animated (chibi) → SD static (chibi) → PokeAPI front → official art
export function getSpriteChain(id, name) {
  const slug = nameToSD(name, id);
  return [
    `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`,
    `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${FORM_API_IDS[id] || id}.png`,
  ];
}

// ── React image loader ─────────────────────────────────────────────────────────
export function loadSpriteWithFallback(img, id, name) {
  if (!img) return;
  const chain = getSpriteChain(id, name);
  let idx = 0;

  function tryNext() {
    if (idx >= chain.length) {
      img.style.opacity = '0.3';
      return;
    }
    img.src = chain[idx++];
  }

  img.onload  = () => { img.style.opacity = '1'; };
  img.onerror = tryNext;
  tryNext();
}
