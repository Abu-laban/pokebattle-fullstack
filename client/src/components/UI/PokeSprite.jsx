// PokeSprite — handles animated GIF → static PNG → official art fallback chain
import { useEffect, useRef } from 'react';
import { loadSpriteWithFallback } from '../../engine/sprites.js';
import styles from './PokeSprite.module.css';

export function PokeSprite({ id, name, size = 88, className = '', style = {}, animated = false, rotating = false }) {
  const imgRef = useRef(null);

  useEffect(() => {
    if (imgRef.current && id) {
      loadSpriteWithFallback(imgRef.current, id, name);
    }
  }, [id, name]);

  const spriteClasses = [
    styles.sprite,
    animated && styles.animated,
    rotating && styles.rotating,
    className
  ].filter(Boolean).join(' ');

  return (
    <img
      ref={imgRef}
      alt={name || ''}
      className={spriteClasses}
      style={{ width: size, height: size, ...style }}
    />
  );
}
