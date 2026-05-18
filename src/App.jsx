import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import CardProxy from './components/CardProxy.jsx'

// ── Confetti (canvas-based, no deps) ───────────────────────────────────────
function launchConfetti() {
  const colors = ['#C92E24', '#ED6223', '#D51085', '#ffffff', '#ffd700']
  const canvas = Object.assign(document.createElement('canvas'), {
    style: 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;',
  })
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height * 0.5,
    w: Math.random() * 10 + 6, h: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    vx: (Math.random() - 0.5) * 4, vy: Math.random() * 4 + 2,
    vrot: (Math.random() - 0.5) * 0.15, opacity: 1,
  }))

  let frame, elapsed = 0
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    elapsed++
    let alive = false
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vrot; p.vy += 0.07
      if (elapsed > 90) p.opacity -= 0.012
      if (p.opacity > 0) {
        alive = true
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
    }
    frame = alive ? requestAnimationFrame(draw) : (canvas.remove(), null)
  }
  draw()
}

const CardType = {
  RAYO: 4,
  OJO: 3,
  ESTRELLA: 2,
  CORONA: 1
}

// Configurable sequences of cards (indices matching CardType elements)
const SEQUENCES = [
  [CardType.RAYO, CardType.OJO, CardType.CORONA],
  [CardType.ESTRELLA, CardType.RAYO, CardType.OJO],
  [CardType.OJO, CardType.ESTRELLA, CardType.CORONA]
]

function playSequenceStartSound() {
  const audio = new Audio('/woosh.mp3')
  audio.volume = 0.45
  audio.play().catch(err => console.warn('Audio playback blocked or failed:', err))
}

function playDoorUnlockSound() {
  const audio = new Audio('/door-unlocking.mp3')
  audio.volume = 0.5
  audio.play().catch(err => console.warn('Audio playback blocked or failed:', err))
}

function playMarioWinsSound() {
  const audio = new Audio('/mario-wins.mp3')
  audio.volume = 0.5
  audio.play().catch(err => console.warn('Audio playback blocked or failed:', err))
}

function playDjStopSound() {
  const audio = new Audio('/dj-stop.mp3')
  audio.volume = 0.5
  audio.play().catch(err => console.warn('Audio playback blocked or failed:', err))
}

export default function App() {
  const [cards, setCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [stage, setStage] = useState(0) // 0 -> idle, 1 -> playing
  const [slotStates, setSlotStates] = useState(['hidden', 'hidden', 'hidden'])

  // Sequence state
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isVictorious, setIsVictorious] = useState(false)

  const sectionRef = useRef(null)
  const gridRef = useRef(null)

  // Fetch cards data once
  useEffect(() => {
    fetch('/data/cards.json')
      .then(r => r.json())
      .then(data => {
        setCards(data)
        setIsLoading(false)
      })
  }, [])

  // ── Button: reveal starting cards ───────────────────────────────────────
  function handleReveal() {
    playSequenceStartSound()
    setStage(1)
    setIsVictorious(false)
    setSelectedSequenceIndex(null)
    setCurrentStep(0)

    setSlotStates(['faceup', 'hidden', 'hidden'])

    // Animate cards section into view
    requestAnimationFrame(() => {
      if (sectionRef.current) {
        gsap.fromTo(sectionRef.current,
          { autoAlpha: 0, y: 40 },
          {
            autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out',
            onComplete: () => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        )
      }
      // Animate all unique starting cards
      const uniqueStartCards = Array.from(new Set(SEQUENCES.map(seq => seq[0])))
      uniqueStartCards.forEach((cardNum) => {
        const slot = gridRef.current?.querySelector(`.card-start-${cardNum}`)
        if (slot) {
          gsap.fromTo(slot,
            { autoAlpha: 0, y: 50, scale: 0.92 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: 'back.out(0.8)' }
          )
        }
      })
    })
  }

  // ── Starting Card Click Handler ──────────────────────────────────────────
  function handleStartCardClick(cardNum) {
    if (selectedSequenceIndex !== null) return

    const seqIdx = SEQUENCES.findIndex(seq => seq[0] === cardNum)
    setSelectedSequenceIndex(seqIdx)

    // Play click sound
    const audio = new Audio('/click.mp3')
    audio.volume = 0.4
    audio.play().catch(err => console.warn('Audio blocked:', err))

    setSlotStates(['faceup', 'hidden', 'hidden'])

    // Reveal both Row 2 cards after a short delay
    setTimeout(() => {
      setCurrentStep(1)
      setSlotStates(['faceup', 'facedown', 'facedown'])

      // Staggered entry animation for the two new slots
      requestAnimationFrame(() => {
        const slotL = gridRef.current?.querySelector(`.card-slot-1`)
        const slotR = gridRef.current?.querySelector(`.card-slot-2`)
        if (slotL) {
          slotL.scrollIntoView({ behavior: 'smooth', block: 'center' })
          gsap.fromTo(slotL,
            { autoAlpha: 0, y: 50, scale: 0.92 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: 'back.out(0.8)' }
          )
        }
        if (slotR) {
          gsap.fromTo(slotR,
            { autoAlpha: 0, y: 50, scale: 0.92 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: 'back.out(0.8)' }
          )
        }
      })
    }, 700)
  }

  // ── Card click handler (per-slot) ──────────────────────────────────────────
  function handleSlotClick(slotIdx) {
    if (selectedSequenceIndex === null) return
    const currentSeq = SEQUENCES[selectedSequenceIndex]
    const isLeftFirst = selectedSequenceIndex % 2 === 0

    if (currentStep === 1 && (slotIdx === 1 || slotIdx === 2) && slotStates[slotIdx] === 'facedown') {
      const trapSlot = isLeftFirst ? 1 : 2

      // Lock further clicks during the timeout!
      setCurrentStep(2)

      setSlotStates(prev => {
        const next = [...prev]
        next[slotIdx] = 'faceup'
        return next
      })

      if (slotIdx === trapSlot) {
        // They clicked the second card of the array! Play DJ-STOP and restart!
        playDjStopSound()
        setTimeout(() => {
          triggerFlyOutAndNextSequence()
        }, 1500)
        return
      }

      // They clicked the last card of the array!
      const finalCard = currentSeq[2]
      if (finalCard === CardType.CORONA) {
        playMarioWinsSound()
        launchConfetti()
        setIsVictorious(true)
      } else {
        playDoorUnlockSound()
        setTimeout(() => {
          triggerFlyOutAndNextSequence()
        }, 1500)
      }
    }
  }

  // ── Fly-out transition to the next sequence ────────────────────────────────
  function triggerFlyOutAndNextSequence() {
    if (gridRef.current) {
      gsap.to(gridRef.current, {
        y: -window.innerHeight * 1.5,
        scale: 0.4,
        rotation: 540,
        opacity: 0,
        duration: 1.4,
        ease: 'power3.in',
        pointerEvents: 'none',
        onComplete: () => {
          playSequenceStartSound()

          setSelectedSequenceIndex(null)
          setCurrentStep(0)
          setIsVictorious(false)

          setSlotStates(['faceup', 'hidden', 'hidden'])

          gsap.set(gridRef.current, {
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            pointerEvents: 'auto',
          })

          requestAnimationFrame(() => {
            const uniqueStartCards = Array.from(new Set(SEQUENCES.map(seq => seq[0])))
            uniqueStartCards.forEach((cardNum) => {
              const slot = gridRef.current?.querySelector(`.card-start-${cardNum}`)
              if (slot) {
                gsap.fromTo(slot,
                  { autoAlpha: 0, y: 50, scale: 0.92 },
                  { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: 'back.out(0.8)' }
                )
              }
            })
          })
        }
      })
    }
  }

  function handleReset() {
    setIsVictorious(false)
    setStage(0)
    setSelectedSequenceIndex(null)
    setCurrentStep(0)
    setSlotStates(['hidden', 'hidden', 'hidden'])
  }

  const currentSeq = selectedSequenceIndex !== null ? SEQUENCES[selectedSequenceIndex] : null
  const btnLabel = isLoading ? 'Cargando...' : stage > 0 ? '¡Éstas son tus cartas!' : 'Revela tus cartas.'
  const isLeftFirst = selectedSequenceIndex !== null ? selectedSequenceIndex % 2 === 0 : true
  const coronaCard = cards[CardType.CORONA - 1]

  function renderSlot(slotIdx, cardNum, isUnchosen = false) {
    const card = cards[cardNum - 1]
    const state = slotStates[slotIdx]
    if (!card || state === 'hidden') return null

    return (
      <div
        key={card.id}
        className={`card-slot card-slot-${slotIdx} ${isUnchosen ? 'is-unchosen' : ''}`}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <CardProxy
          id={card.id}
          name={card.name}
          set={card.set}
          number={card.number}
          types={card.types}
          supertype={card.supertype}
          subtypes={card.subtypes}
          rarity={card.rarity}
          isReverse={card.isReverse}
          img={card.images.large}
          flipped={state === 'facedown'}
          onCardClick={() => !isUnchosen && handleSlotClick(slotIdx)}
        />
      </div>
    )
  }

  return (
    <main className="page-container">
      <div className="noise-overlay" />

      <header className="hero-section">
        <div className="logo-container">
          <img src="thumb.png" alt="Logo Factor Aleatorio" className="logo-img" />
        </div>
        <h1 className={`main-title ${isVictorious ? 'victory-title' : ''}`}>
          {isVictorious ? 'Encontraste el camino' : 'Pedí ayuda al Oráculo. O no...'}
        </h1>
        <div className="btn-container">
          {isVictorious ? (
            <button
              className="gradient-btn"
              onClick={handleReset}
            >
              Volver a empezar
            </button>
          ) : (
            <button
              className="gradient-btn"
              onClick={handleReveal}
              disabled={stage > 0 || isLoading}
            >
              {btnLabel}
            </button>
          )}
        </div>
      </header>

      {stage > 0 && (
        <section
          ref={sectionRef}
          className="cards-section"
          style={{ visibility: 'visible', height: 'auto', overflow: 'visible' }}
        >
          {isVictorious ? (
            <div className="victory-container" style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '2rem 0' }}>
              <div className="card-slot card-slot-victory" style={{ position: 'relative', zIndex: 10, filter: 'drop-shadow(0 0 35px rgba(255, 215, 0, 0.6))' }}>
                {coronaCard && (
                  <CardProxy
                    id={coronaCard.id}
                    name={coronaCard.name}
                    set={coronaCard.set}
                    number={coronaCard.number}
                    types={coronaCard.types}
                    supertype={coronaCard.supertype}
                    subtypes={coronaCard.subtypes}
                    rarity={coronaCard.rarity}
                    isReverse={coronaCard.isReverse}
                    img={coronaCard.images.large}
                    flipped={false}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="cards-grid" ref={gridRef}>
              {/* Row 1: Starting Cards or Selected First Card */}
              {selectedSequenceIndex === null ? (
                <div className="cards-row row-1">
                  {Array.from(new Set(SEQUENCES.map(seq => seq[0]))).map((cardNum, idx) => {
                    const card = cards[cardNum - 1]
                    if (!card) return null
                    return (
                      <div
                        key={`start-${idx}`}
                        className={`card-slot card-start-${cardNum}`}
                        style={{ position: 'relative', zIndex: 1 }}
                      >
                        <CardProxy
                          id={card.id}
                          name={card.name}
                          set={card.set}
                          number={card.number}
                          types={card.types}
                          supertype={card.supertype}
                          subtypes={card.subtypes}
                          rarity={card.rarity}
                          isReverse={card.isReverse}
                          img={card.images.large}
                          flipped={false}
                          onCardClick={() => handleStartCardClick(cardNum)}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="cards-row row-1">
                  {renderSlot(0, currentSeq[0])}
                </div>
              )}

              {/* Row 2: Two Cards (seq[1] and seq[2]) */}
              {selectedSequenceIndex !== null && currentSeq[1] !== undefined && currentSeq[2] !== undefined && (
                <div className="cards-row row-2">
                  {renderSlot(1, isLeftFirst ? currentSeq[1] : currentSeq[2])}
                  {renderSlot(2, isLeftFirst ? currentSeq[2] : currentSeq[1])}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Footer / Audio Reminder */}
      <footer className="footer-note">
        <p>Encendé tus sonido 🔊</p>
      </footer>
    </main>
  )
}
