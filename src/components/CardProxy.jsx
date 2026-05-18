/**
 * CardProxy resolves image/foil/mask URLs and normalizes rarity strings,
 * then delegates to Card for rendering.
 */
import Card from './Card.jsx'
import altArts from '../lib/components/alternate-arts.json'
import promos from '../lib/components/promos.json'

function isDef(v) { return v !== undefined && v !== null }

export default function CardProxy({
  id, name, number, set, types, subtypes, supertype,
  rarity: rarityIn, isReverse = false,
  img, back, foil: foilIn, mask: maskIn,
  flipped = false, onCardClick,
}) {
  // ── Derive flags ────────────────────────────────────────────────────────────
  const isShiny = isDef(number) && number.toString().toLowerCase().startsWith('sv')
  const isGallery = isDef(number) && !!number.toString().match(/^[tg]g/i)
  const isAlternate = isDef(id) && altArts.includes(id) && !isShiny && !isGallery
  const isPromo = isDef(set) && set === 'swshp'

  // ── Mutate rarity based on card type ───────────────────────────────────────
  let rarity = rarityIn ?? 'common'
  if (isReverse) rarity += ' Reverse Holo'

  if (isGallery) {
    if (isDef(rarity) && rarity.startsWith('Trainer Gallery')) rarity = rarity.replace(/Trainer Gallery\s*/, '')
    if (rarity.includes('Rare Holo V') && subtypes?.includes('VMAX')) rarity = 'Rare Holo VMAX'
    if (rarity.includes('Rare Holo V') && subtypes?.includes('VSTAR')) rarity = 'Rare Holo VSTAR'
  }

  if (isPromo) {
    if (id === 'swshp-SWSH076' || id === 'swshp-SWSH077') rarity = 'Rare Secret'
    else if (subtypes?.includes('V')) rarity = 'Rare Holo V'
    else if (subtypes?.includes('V-UNION')) rarity = 'Rare Holo VUNION'
    else if (subtypes?.includes('VMAX')) rarity = 'Rare Holo VMAX'
    else if (subtypes?.includes('VSTAR')) rarity = 'Rare Holo VSTAR'
    else if (subtypes?.includes('Radiant')) rarity = 'Radiant Rare'
  }

  // ── Resolve image URL ───────────────────────────────────────────────────────
  const resolvedImg = isDef(img) ? img
    : (isDef(set) && isDef(number))
      ? `https://images.pokemontcg.io/${set.toLowerCase()}/${number}_hires.png`
      : ''

  const foil = foilIn || null
  const mask = maskIn || null

  return (
    <Card
      id={id} name={name} number={number} set={set}
      types={types} subtypes={subtypes} supertype={supertype}
      rarity={rarity}
      img={resolvedImg} back={back} foil={foil} mask={mask}
      flipped={flipped}
      onCardClick={onCardClick}
    />
  )
}
