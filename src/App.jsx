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

// Configurable sequences of cards (1-based indices matching cards.json elements)
const SEQUENCES = [
  [1, 2, 3, 4],
  [4, 3, 2, 1]
]

export default function App() {
  const [cards, setCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [stage, setStage] = useState(0) // 0 -> idle, 1 -> playing
  const [cardStates, setCardStates] = useState([]) // [{revealed, flipped}]

  // Sequence state
  const [sequenceIndex, setSequenceIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const sectionRef = useRef(null)
  const gridRef = useRef(null)

  // Fetch cards data once
  useEffect(() => {
    fetch('/data/cards.json')
      .then(r => r.json())
      .then(data => {
        setCards(data)
        setCardStates(data.map(() => ({ revealed: false, flipped: true })))
        setIsLoading(false)
      })
  }, [])

  // ── Button: reveal first card of the active sequence ────────────────────────
  function handleReveal() {
    setStage(1)
    
    const currentSeq = SEQUENCES[sequenceIndex]
    const firstCardIndex = currentSeq[0] - 1

    setCardStates(prev => {
      const next = prev.map((cs, idx) =>
        idx === firstCardIndex ? { revealed: true, flipped: true } : { revealed: false, flipped: true }
      )
      return next
    })

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
    })
  }

  // ── Card click handler (per-card) ──────────────────────────────────────────
  function handleCardClick(i) {
    const currentSeq = SEQUENCES[sequenceIndex]
    const activeCardIndex = currentSeq[currentStep] - 1

    // Progression only occurs if user clicks the next face-down card in sequence
    if (i === activeCardIndex && cardStates[i]?.flipped) {
      // 1. Flip card face-up
      setCardStates(prev => {
        const next = [...prev]
        next[i] = { ...next[i], flipped: false }
        return next
      })

      const isLastStep = currentStep === currentSeq.length - 1

      if (!isLastStep) {
        // 2a. Progression step: reveal next card in sequence after a short delay
        setTimeout(() => {
          const nextStep = currentStep + 1
          const nextCardIndex = currentSeq[nextStep] - 1

          setCurrentStep(nextStep)
          setCardStates(prev => {
            const next = [...prev]
            next[nextCardIndex] = { revealed: true, flipped: true }
            return next
          })

          // Staggered entry animation for the new slot
          requestAnimationFrame(() => {
            const slot = gridRef.current?.querySelector(`.card-slot-${nextCardIndex}`)
            if (slot) {
              gsap.fromTo(slot,
                { autoAlpha: 0, y: 50, scale: 0.92 },
                { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: 'back.out(0.8)' }
              )
            }
          })
        }, 700)
      } else {
        // 2b. Sequence finalization: launch confetti & transition to next sequence
        launchConfetti()
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
          // Advance sequence index
          const nextSeqIndex = (sequenceIndex + 1) % SEQUENCES.length
          setSequenceIndex(nextSeqIndex)
          setCurrentStep(0)

          const nextSeq = SEQUENCES[nextSeqIndex]
          const firstCardIndex = nextSeq[0] - 1

          // Initialize states so only the first card of the new sequence is visible
          setCardStates(cards.map((_, idx) => ({
            revealed: idx === firstCardIndex,
            flipped: true,
          })))

          // Reset grid properties
          gsap.set(gridRef.current, {
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            pointerEvents: 'auto',
          })

          // Staggered entry animation for the new sequence's first card slot
          requestAnimationFrame(() => {
            const slot = gridRef.current?.querySelector(`.card-slot-${firstCardIndex}`)
            if (slot) {
              gsap.fromTo(slot,
                { autoAlpha: 0, y: 50, scale: 0.92 },
                { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: 'back.out(0.8)' }
              )
            }
          })
        }
      })
    }
  }

  const btnLabel = isLoading ? 'Cargando...' : stage > 0 ? '¡Éstas son tus cartas!' : 'Revela tus cartas.'

  return (
    <main className="page-container">
      <div className="noise-overlay" />

      <header className="hero-section">
        <div className="logo-container">
          <img src="thumb.png" alt="Logo Factor Aleatorio" className="logo-img" />
        </div>
        <h1 className="main-title">Llegó la hora.</h1>
        <div className="btn-container">
          <button
            className="gradient-btn"
            onClick={handleReveal}
            disabled={stage > 0 || isLoading}
          >
            {btnLabel}
          </button>
        </div>
      </header>

      {/* Cards section — hidden until stage > 0 */}
      <section
        ref={sectionRef}
        className="cards-section"
        style={{ visibility: stage > 0 ? 'visible' : 'hidden', height: stage > 0 ? 'auto' : 0, overflow: stage > 0 ? 'visible' : 'hidden' }}
      >
        <div className="cards-grid" ref={gridRef}>
          {cards.map((card, i) =>
            cardStates[i]?.revealed ? (
              <div
                key={card.id}
                className={`card-slot card-slot-${i}`}
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
                  flipped={cardStates[i].flipped}
                  onCardClick={() => handleCardClick(i)}
                />
              </div>
            ) : null
          )}
        </div>
      </section>
    </main>
  )
}
