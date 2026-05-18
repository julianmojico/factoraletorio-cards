import { useRef, useEffect, useCallback, useState } from 'react'
import gsap from 'gsap'
import { clamp, round, adjust } from '../lib/math.js'
import { getActiveCard, setActiveCard, subscribeActiveCard } from '../lib/activeCard.js'

const BACK_IMG = '/img/Dorso.png'

// Build CSS custom-property object from the live GSAP-animated vars object.
function buildDynamicStyleObj(vars) {
  const fromCenter = clamp(
    Math.sqrt((vars.glareY - 50) ** 2 + (vars.glareX - 50) ** 2) / 50,
    0, 1
  )
  return {
    '--pointer-x': `${vars.glareX}%`,
    '--pointer-y': `${vars.glareY}%`,
    '--pointer-from-center': fromCenter,
    '--pointer-from-top': vars.glareY / 100,
    '--pointer-from-left': vars.glareX / 100,
    '--card-opacity': vars.glareO,
    '--rotate-x': `${vars.rotX}deg`,
    '--rotate-y': `${vars.rotY}deg`,
    '--background-x': `${vars.bgX}%`,
    '--background-y': `${vars.bgY}%`,
    '--card-scale': vars.scale,
    '--translate-x': `${vars.tx}px`,
    '--translate-y': `${vars.ty}px`,
  }
}

export default function Card({
  id = '', name = '', number = '', set = '',
  types = '', subtypes = 'basic', supertype = 'pokémon',
  rarity = 'common', img = '', foil = '', mask = '',
  flipped = false, onCardClick,
}) {
  const cardRef = useRef(null)
  const varsRef = useRef({
    glareX: 50, glareY: 50, glareO: 0,
    rotX: flipped ? 180 : 0, rotY: 0,
    bgX: 50, bgY: 50,
    scale: 1, tx: 0, ty: 0,
  })
  const tweenRef = useRef(null)
  const rafRef = useRef(null)

  const [isActive, setIsActive] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [loading, setLoading] = useState(true)

  // Seed-derived values (stable for this card instance)
  const seed = useRef({ x: Math.random(), y: Math.random() })
  const cosmos = useRef({
    x: Math.floor(seed.current.x * 734),
    y: Math.floor(seed.current.y * 1280),
  })

  // Static style object – CSS custom props for seed/cosmos (never change)
  const staticStyleObj = {
    '--seedx': seed.current.x,
    '--seedy': seed.current.y,
    '--cosmosbg': `${cosmos.current.x}px ${cosmos.current.y}px`,
    ...(foil ? { '--foil': `url(${foil})` } : {}),
    ...(mask ? { '--mask': `url(${mask})` } : {}),
  }

  // Image resolution
  const imgBase = (img.startsWith('http') || img.startsWith('/') || img.startsWith('.')) ? '' : 'https://images.pokemontcg.io/'
  const frontImg = imgBase + img
  const isTrainerGallery = !!number.toString().match(/^[tg]g/i)

  // Normalized attribute values
  const typeClass = Array.isArray(types) ? types.join(' ').toLowerCase() : (types?.toLowerCase() ?? '')
  const normalizedRarity = rarity.toLowerCase()
  const normalizedSupertype = supertype.toLowerCase()
  const normalizedSubtypes = Array.isArray(subtypes) ? subtypes.join(' ').toLowerCase() : (subtypes?.toLowerCase() ?? 'basic')
  const normalizedNumber = number.toString().toLowerCase()

  // ── DOM style flush (bypasses React re-render for 60fps GSAP updates) ──────
  const flushStyles = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (!cardRef.current) return
      const dyn = buildDynamicStyleObj(varsRef.current)
      for (const [k, v] of Object.entries(dyn)) {
        cardRef.current.style.setProperty(k, v)
      }
    })
  }, [])

  // ── Snap back to neutral ────────────────────────────────────────────────────
  const snapToRest = useCallback((delay = 500) => {
    setIsInteracting(false)
    setTimeout(() => {
      if (tweenRef.current) tweenRef.current.kill()
      tweenRef.current = gsap.to(varsRef.current, {
        glareX: 50, glareY: 50, glareO: 0,
        rotX: flipped ? 180 : 0, rotY: 0,
        bgX: 50, bgY: 50,
        duration: 0.8, ease: 'power3.out',
        onUpdate: flushStyles,
      })
    }, delay)
  }, [flipped, flushStyles])

  // ── Pointer move → tilt + glare ────────────────────────────────────────────
  const handlePointerMove = useCallback((e) => {
    if (getActiveCard() && getActiveCard() !== cardRef.current) return
    setIsInteracting(true)

    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const px = clamp(round((100 / rect.width) * (clientX - rect.left)))
    const py = clamp(round((100 / rect.height) * (clientY - rect.top)))
    const cx = px - 50, cy = py - 50

    if (tweenRef.current) tweenRef.current.kill()
    tweenRef.current = gsap.to(varsRef.current, {
      bgX: adjust(px, 0, 100, 37, 63),
      bgY: adjust(py, 0, 100, 33, 67),
      rotX: round(-(cx / 3.5)) + (flipped ? 180 : 0),
      rotY: round(cy / 3.5),
      glareX: round(px),
      glareY: round(py),
      glareO: 1,
      duration: 0.12, ease: 'power1.out',
      onUpdate: flushStyles,
    })
  }, [flipped, flushStyles])

  // ── Click → activate / deactivate ──────────────────────────────────────────
  const handleClick = useCallback(() => {
    const active = getActiveCard()
    if (active === cardRef.current) {
      setActiveCard(undefined)
      setIsActive(false)
      snapToRest(0)
    } else {
      setActiveCard(cardRef.current)
      setIsActive(true)
      const rect = cardRef.current.getBoundingClientRect()
      const view = document.documentElement
      const tx = round(view.clientWidth / 2 - rect.x - rect.width / 2)
      const ty = round(view.clientHeight / 2 - rect.y - rect.height / 2)
      const scale = Math.min((window.innerWidth / rect.width) * 0.9, (window.innerHeight / rect.height) * 0.9, 1.75)
      if (tweenRef.current) tweenRef.current.kill()
      tweenRef.current = gsap.to(varsRef.current, {
        tx, ty, scale,
        duration: 0.5, ease: 'back.out(1.4)',
        onUpdate: flushStyles,
      })
    }
    onCardClick?.()
  }, [snapToRest, flushStyles, onCardClick])

  // ── React when another card is activated ───────────────────────────────────
  useEffect(() => subscribeActiveCard((el) => {
    if (el !== cardRef.current && isActive) {
      setIsActive(false)
      snapToRest(0)
    }
  }), [isActive, snapToRest])

  // ── Animate flip when `flipped` prop changes ───────────────────────────────
  useEffect(() => {
    if (tweenRef.current) tweenRef.current.kill()
    tweenRef.current = gsap.to(varsRef.current, {
      rotX: flipped ? 180 : 0,
      duration: 0.7, ease: 'power2.inOut',
      onUpdate: flushStyles,
    })
  }, [flipped, flushStyles])

  // ── Apply static custom props once on mount ────────────────────────────────
  useEffect(() => {
    if (!cardRef.current) return
    for (const [k, v] of Object.entries(staticStyleObj)) {
      cardRef.current.style.setProperty(k, v)
    }
    // Seed initial dynamic values too
    flushStyles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={[
        'card', typeClass, 'interactive',
        isActive ? 'active' : '',
        isInteracting ? 'interacting' : '',
        loading ? 'loading' : '',
        mask ? 'masked' : '',
      ].filter(Boolean).join(' ')}
      data-number={normalizedNumber}
      data-set={set}
      data-subtypes={normalizedSubtypes}
      data-supertype={normalizedSupertype}
      data-rarity={normalizedRarity}
      data-trainer-gallery={isTrainerGallery}
      ref={cardRef}
    >
      <div className="card__translater">
        <button
          className="card__rotator"
          onClick={handleClick}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => snapToRest(500)}
          onBlur={() => snapToRest()}
          aria-label={`Expandir carta de Factor Aleatorio: ${name}`}
          tabIndex={0}
        >
          <img
            className="card__back"
            src={BACK_IMG}
            alt="Dorso de carta Factor Aleatorio"
            loading="lazy"
            width={660}
            height={921}
          />
          <div className="card__front" style={staticStyleObj}>
            <img
              src={frontImg}
              alt={`Carta Factor Aleatorio: ${name}`}
              onLoad={() => setLoading(false)}
              loading="lazy"
              width={660}
              height={921}
            />
            <div className="card__shine" />
            <div className="card__glare" />
          </div>
        </button>
      </div>
    </div>
  )
}
