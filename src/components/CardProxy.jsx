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

  // ── Resolve foil/mask URLs ──────────────────────────────────────────────────
  function resolveFoilMask(prop, type) {
    if (isDef(prop)) return prop === false ? '' : prop

    if (!isDef(rarity) || !isDef(subtypes) || !isDef(supertype) || !isDef(set) || !isDef(number)) return ''

    const fRarity = rarity.toLowerCase()
    const fNumber = number.toString().toLowerCase().replace('swsh', '').padStart(3, '0')
    const fSet = set.toString().toLowerCase().replace(/(tg|gg|sv)/, '')
    const server = import.meta.env.VITE_CDN ?? ''

    let etch = 'holo', style = 'reverse', ext = 'webp'

    if (fRarity === 'rare holo') style = 'swholo'
    if (fRarity === 'rare holo cosmos') style = 'cosmos'
    if (fRarity === 'radiant rare') { etch = 'etched'; style = 'radiantholo' }
    if (['rare holo v', 'rare holo vunion', 'basic v'].includes(fRarity)) { etch = 'holo'; style = 'sunpillar' }
    if (['rare holo vmax', 'rare ultra', 'rare holo vstar'].includes(fRarity)) { etch = 'etched'; style = 'sunpillar' }
    if (['amazing rare', 'rare rainbow', 'rare secret'].includes(fRarity)) { etch = 'etched'; style = 'swsecret' }

    if (isShiny) {
      etch = 'etched'; style = 'sunpillar'
      if (fRarity === 'rare shiny vmax' || (fRarity === 'rare holo vmax' && fNumber.startsWith('sv'))) style = 'swsecret'
    }

    if (isGallery) {
      etch = 'holo'; style = 'rainbow'
      if (fRarity.includes('rare holo v') || fRarity.includes('rare ultra')) { etch = 'etched'; style = 'sunpillar' }
      if (fRarity.includes('rare secret')) { etch = 'etched'; style = 'swsecret' }
    }

    if (isAlternate) {
      etch = 'etched'
      style = subtypes?.includes('VMAX') ? 'swsecret' : 'sunpillar'
    }

    if (isPromo) {
      const promoStyle = promos[id]
      if (promoStyle) { style = promoStyle.style.toLowerCase(); etch = promoStyle.etch.toLowerCase() }
    }

    return `${server}/img/${type}/${fSet}/${fNumber}_${etch}_${style}.${ext}`
  }

  const foil = resolveFoilMask(foilIn, 'foils')
  const mask = resolveFoilMask(maskIn, 'masks')

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
