<script>
  import { onMount, tick } from "svelte";
  import Card from "./lib/components/CardProxy.svelte";
  import { activeCard } from "./lib/stores/activeCard.js";

  let cards = [];
  let isLoading = true;
  let revealed = false;
  let slotRefs = [];
  let cardsSection;

  // ── Confetti ────────────────────────────────────────────────────────────────
  function launchConfetti() {
    const colors = ["#C92E24", "#ED6223", "#D51085", "#ffffff", "#ffd700"];
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.5,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      vrot: (Math.random() - 0.5) * 0.15,
      opacity: 1,
    }));

    let frame;
    let elapsed = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      elapsed++;
      let alive = false;

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.vy += 0.07; // gravity
        if (elapsed > 90) p.opacity -= 0.012;
        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (alive) {
        frame = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(frame);
        canvas.remove();
      }
    };

    draw();
  }

  // ── Reveal handler ──────────────────────────────────────────────────────────
  async function handleReveal() {
    revealed = true;
    await tick(); // wait for DOM to update (cards now visible)

    // Scroll smoothly to the cards section
    if (cardsSection) {
      cardsSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Small delay before confetti so the scroll starts first
    setTimeout(launchConfetti, 350);
  }

  // ── Data loading ────────────────────────────────────────────────────────────
  onMount(async () => {
    const res = await fetch("/data/cards.json");
    cards = await res.json();
    isLoading = false;
  });
</script>

<main class="page-container">
  <!-- Noise Overlay -->
  <div class="noise-overlay"></div>

  <!-- ── Hero ── -->
  <header class="hero-section">
    <div class="logo-container">
      <img
        src="thumb.png"
        alt="Logo Factor Aleatorio"
        class="logo-img"
      />
    </div>

    <h1 class="main-title">Llegó la hora.</h1>

    <!-- <p class="main-subtitle"></p> -->

    <div class="btn-container">
      <button
        class="gradient-btn"
        on:click={handleReveal}
        disabled={revealed || isLoading}
      >
        {#if isLoading}
          Cargando...
        {:else if revealed}
          ¡Éstas son tus cartas!
        {:else}
          Revela tus cartas.
        {/if}
      </button>
    </div>
  </header>

  <!-- ── Cards Grid ── -->
  <section class="cards-section" class:revealed bind:this={cardsSection}>
    {#if !isLoading}
      <div class="cards-grid">
        {#each cards as card, i}
          <div
            class="card-slot"
            class:slot-active={slotRefs[i] && slotRefs[i].contains($activeCard)}
            style="--delay: {i * 120}ms"
            bind:this={slotRefs[i]}
          >
            <Card
              id={card.id}
              name={card.name}
              set={card.set}
              number={card.number}
              types={card.types}
              supertype={card.supertype}
              subtypes={card.subtypes}
              rarity={card.rarity}
              isReverse={card.isReverse}
              showcase={true}
              img={card.images.large}
            />
          </div>
        {/each}
      </div>
    {/if}
  </section>
</main>

<style>
  /* ── Global ── */
  :global(body) {
    background-color: #0c0b0e;
    background-image: radial-gradient(
        circle at 10% 85%,
        rgba(186, 12, 120, 0.38) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 90% 25%,
        rgba(210, 82, 10, 0.28) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 50% 50%,
        rgba(25, 20, 30, 0.95) 0%,
        #070608 100%
      );
    background-attachment: fixed;
    font-family: "Outfit", sans-serif;
    overflow-x: hidden;
  }

  /* ── Layout ── */
  .page-container {
    position: relative;
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px 80px;
    box-sizing: border-box;
  }

  /* ── Noise ── */
  .noise-overlay {
    position: fixed;
    inset: 0;
    opacity: 0.055;
    pointer-events: none;
    z-index: 1;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  /* ── Hero ── */
  .hero-section {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 680px;
    width: 100%;
    margin-bottom: 48px;
  }

  .logo-container {
    margin-bottom: 24px;
    transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .logo-container:hover {
    transform: scale(1.08);
  }

  .logo-img {
    width: 100px;
    height: 100px;
    object-fit: contain;
  }

  .main-title {
    font-size: 2.2rem;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 16px;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .main-subtitle {
    font-size: 1.1rem;
    color: #9ca3af;
    margin: 0 0 32px;
    line-height: 1.6;
    max-width: 520px;
  }

  /* ── Button ── */
  .gradient-btn {
    padding: 14px 36px;
    font-family: "Outfit", sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #ffffff;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    background-image: linear-gradient(to right, #c92e24, #ed6223, #d51085);
    transition:
      transform 0.2s ease,
      filter 0.2s ease,
      box-shadow 0.2s ease;
    box-shadow: 0 4px 20px rgba(237, 98, 35, 0.25);
  }
  .gradient-btn:hover:not(:disabled) {
    transform: scale(1.04);
    filter: brightness(1.12);
    box-shadow: 0 6px 28px rgba(237, 98, 35, 0.4);
  }
  .gradient-btn:active:not(:disabled) {
    transform: scale(0.97);
  }
  .gradient-btn:disabled {
    opacity: 0.7;
    cursor: default;
  }

  /* ── Cards Section ── */
  .cards-section {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 760px;

    /* Hidden state – no height, no visibility, no interaction */
    visibility: hidden;
    height: 0;
    overflow: hidden;
    pointer-events: none;
  }

  /* Revealed state */
  .cards-section.revealed {
    visibility: visible;
    height: auto;
    overflow: visible;
    pointer-events: auto;
  }

  /* 2 × 2 flex grid */
  .cards-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 300px 120px;
    padding: 8px 0;
  }

  /* Each slot takes ~half the row */
  .card-slot {
    flex: 0 0 calc(50% - 10px);
    max-width: 320px;
    display: flex;
    justify-content: center;

    /* Needed so z-index works relative to sibling slots */
    position: relative;
    z-index: 1;

    /* Slide-up + fade-in on reveal */
    opacity: 0;
    transform: translateY(48px);

    transition: z-index 0s;
  }

  /* Elevate the slot whose card is currently active */
  .card-slot.slot-active {
    z-index: 100;
  }

  /* When parent is revealed, animate each slot with a staggered delay */
  .cards-section.revealed .card-slot {
    animation: cardReveal 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: var(--delay);
  }

  @keyframes cardReveal {
    from {
      opacity: 0;
      transform: translateY(48px) scale(0.94);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ── Responsive ── */
  @media screen and (max-width: 600px) {
    .card-slot {
      flex: 0 0 100%;
      max-width: 340px;
    }
    .main-title {
      font-size: 1.8rem;
    }
  }

  @media screen and (min-width: 768px) {
    .logo-img {
      width: 120px;
      height: 120px;
    }
    .main-title {
      font-size: 2.8rem;
    }
    .main-subtitle {
      font-size: 1.2rem;
    }
  }
</style>
