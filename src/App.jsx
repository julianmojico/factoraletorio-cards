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
  [1, 2, 3, 4, 1],
  [4, 3, 2, 1, 4]
]

function playSequenceStartSound() {
  const audio = new Audio('/woosh.mp3')
  audio.volume = 0.45
  audio.play().catch(err => console.warn('Audio playback blocked or failed:', err))
}

export default function App() {
  const [cards, setCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [stage, setStage] = useState(0) // 0 -> idle, 1 -> playing
  const [slotStates, setSlotStates] = useState([
    { revealed: false, flipped: true },
    { revealed: false, flipped: true },
    { revealed: false, flipped: true },
    { revealed: false, flipped: true }
  ])

  // Sequence state
  const [sequenceIndex, setSequenceIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [chosenBranch, setChosenBranch] = useState(null)

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

  // ── Button: reveal first card of the active sequence ────────────────────────
  function handleReveal() {
    playSequenceStartSound()
    setStage(1)

    setSlotStates([
      { revealed: true, flipped: true },
      { revealed: false, flipped: true },
      { revealed: false, flipped: true },
      { revealed: false, flipped: true }
    ])

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

  // ── Card click handler (per-slot) ──────────────────────────────────────────
  function handleSlotClick(slotIdx) {
    const currentSeq = SEQUENCES[sequenceIndex]
    
    // Step 0: Click first card
    if (currentStep === 0 && slotIdx === 0 && slotStates[0].flipped) {
      // Flip card face-up
      setSlotStates(prev => {
        const next = [...prev]
        next[0] = { ...next[0], flipped: false }
        return next
      })

      // Reveal both Row 2 cards after a short delay
      setTimeout(() => {
        setCurrentStep(1)
        setSlotStates(prev => {
          const next = [...prev]
          next[1] = { revealed: true, flipped: true }
          next[2] = { revealed: true, flipped: true }
          return next
        })

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
    // Step 1: Click one of the two middle cards
    else if (currentStep === 1 && (slotIdx === 1 || slotIdx === 2) && slotStates[slotIdx].flipped) {
      const branch = slotIdx === 1 ? 'left' : 'right'
      setChosenBranch(branch)

      // Flip the chosen card face-up
      setSlotStates(prev => {
        const next = [...prev]
        next[slotIdx] = { ...next[slotIdx], flipped: false }
        return next
      })

      // Reveal the corresponding final card after a short delay
      setTimeout(() => {
        setCurrentStep(2)
        setSlotStates(prev => {
          const next = [...prev]
          next[3] = { revealed: true, flipped: true }
          return next
        })

        // Staggered entry animation for the final slot
        requestAnimationFrame(() => {
          const slot = gridRef.current?.querySelector(`.card-slot-3`)
          if (slot) {
            slot.scrollIntoView({ behavior: 'smooth', block: 'center' })
            gsap.fromTo(slot,
              { autoAlpha: 0, y: 50, scale: 0.92 },
              { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: 'back.out(0.8)' }
            )
          }
        })
      }, 700)
    }
    // Step 2: Click the final card
    else if (currentStep === 2 && slotIdx === 3 && slotStates[3].flipped) {
      // Flip final card face-up
      setSlotStates(prev => {
        const next = [...prev]
        next[3] = { ...next[3], flipped: false }
        return next
      })

      // Launch confetti & transition to next sequence
      launchConfetti()
      setTimeout(() => {
        triggerFlyOutAndNextSequence()
      }, 1500)
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
          // Play sequence start sound for the new sequence!
          playSequenceStartSound()

          // Reset branch selection state
          setChosenBranch(null)

          // Advance sequence index
          const nextSeqIndex = (sequenceIndex + 1) % SEQUENCES.length
          setSequenceIndex(nextSeqIndex)
          setCurrentStep(0)

          // Reset slot states for the next sequence's first card slot
          setSlotStates([
            { revealed: true, flipped: true },
            { revealed: false, flipped: true },
            { revealed: false, flipped: true },
            { revealed: false, flipped: true }
          ])

          // Reset grid properties
          gsap.set(gridRef.current, {
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            pointerEvents: 'auto',
          })

          // Staggered entry animation for the first card slot
          requestAnimationFrame(() => {
            const slot = gridRef.current?.querySelector(`.card-slot-0`)
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

  const currentSeq = SEQUENCES[sequenceIndex]
  const btnLabel = isLoading ? 'Cargando...' : stage > 0 ? '¡Éstas son tus cartas!' : 'Revela tus cartas.'

  function renderSlot(slotIdx, cardNum, isUnchosen = false) {
    const card = cards[cardNum - 1]
    const state = slotStates[slotIdx]
    if (!card || !state || !state.revealed) return null

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
          flipped={state.flipped}
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
          {/* Row 1: First Card */}
          <div className="cards-row row-1">
            {renderSlot(0, currentSeq[0])}
          </div>

          {/* Row 2: Two Cards */}
          <div className="cards-row row-2">
            {renderSlot(1, currentSeq[1], chosenBranch === 'right')}
            {renderSlot(2, currentSeq[2], chosenBranch === 'left')}
          </div>

          {/* Row 3: Branch final card */}
          <div className="cards-row row-3">
            {chosenBranch === 'left' && renderSlot(3, currentSeq[3])}
            {chosenBranch === 'right' && renderSlot(3, currentSeq[4])}
          </div>
        </div>
      </section>
    </main>
  )
}
