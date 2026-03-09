import { PokeSprite } from './PokeSprite.jsx';
import { Pokemon3D } from './Pokemon3D.jsx';

export function PokemonSprite({ id, name, size = 88, className = '', style = {}, mode = '2d', animated = false, rotating = false, autoRotate = true }) {
  if (mode === '3d') {
    return (
      <Pokemon3D
        pokemonId={id}
        name={name}
        size={size}
        autoRotate={autoRotate}
        className={className}
      />
    );
  }

  return (
    <PokeSprite
      id={id}
      name={name}
      size={size}
      className={className}
      style={style}
      animated={animated}
      rotating={rotating}
    />
  );
}