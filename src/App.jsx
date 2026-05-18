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

// ── Sequence states ─────────────────────────────────────────────────────────
// stage 0 → hidden
// stage 1 → Carta 1 visible (flipped / face-down)
// stage 2 → All 3+ cards visible (Carta 2 & 3 also face-down)
// stage 3 → fly-out animation triggered

export default function App() {
  const [cards, setCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [stage, setStage] = useState(0)
  const [cardStates, setCardStates] = useState([])   // [{revealed, flipped}]
  const sectionRef = useRef(null)
  const gridRef = useRef(null)

  useEffect(() => {
    fetch('/data/cards.json')
      .then(r => r.json())
      .then(data => {
        setCards(data)
        setCardStates(data.map(() => ({ revealed: false, flipped: true })))
        setIsLoading(false)
      })
  }, [])

  // ── Button: reveal first card ──────────────────────────────────────────────
  function handleReveal() {
    setStage(1)
    setCardStates(prev => {
      const next = [...prev]
      next[0] = { ...next[0], revealed: true }
      return next
    })

    // Animate section into view with GSAP
    requestAnimationFrame(() => {
      if (sectionRef.current) {
        gsap.fromTo(sectionRef.current,
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out',
            onComplete: () => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
        )
      }
    })
  }

  // ── Card click handler (per-card) ──────────────────────────────────────────
  function handleCardClick(i) {
    // Stage 1: only card 0 is visible and flipped
    if (stage === 1 && i === 0 && cardStates[0]?.flipped) {
      // Flip card 0 face-up
      setCardStates(prev => {
        const next = [...prev]
        next[0] = { ...next[0], flipped: false }
        return next
      })
      // After flip animation, reveal remaining cards
      setTimeout(() => {
        setStage(2)
        setCardStates(prev => {
          const next = prev.map((cs, idx) =>
            idx > 0 ? { ...cs, revealed: true } : cs
          )
          return next
        })
        launchConfetti()
        // GSAP staggered entrance for the new cards
        requestAnimationFrame(() => {
          const slots = gridRef.current?.querySelectorAll('.card-slot:not(.card-slot-0)')
          if (slots?.length) {
            gsap.fromTo(slots,
              { autoAlpha: 0, y: 50, scale: 0.92 },
              { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(1.4)' }
            )
          }
        })
      }, 700)
      return
    }

    // Stage 2+: clicking card 1 or 2
    if (stage >= 2 && i >= 1) {
      const cs = cardStates[i]
      if (cs.flipped) {
        // Flip face-up
        setCardStates(prev => {
          const next = [...prev]
          next[i] = { ...next[i], flipped: false }
          return next
        })
      } else {
        // Second click → trigger fly-out
        triggerFlyOut()
      }
    }
  }

  // ── Fly-out animation (anim1) ──────────────────────────────────────────────
  function triggerFlyOut() {
    if (stage === 3) return
    setStage(3)
    launchConfetti()
    if (gridRef.current) {
      gsap.to(gridRef.current, {
        y: -window.innerHeight * 1.5,
        scale: 0.4,
        rotation: 540,
        opacity: 0,
        duration: 1.4,
        ease: 'power3.in',
        pointerEvents: 'none',
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
