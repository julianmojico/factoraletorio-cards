# AI Agent Instructions

## Project overview
- Frontend-only Vite app.
- Primary app uses React + GSAP for interactive holographic card UI.
- Data-driven card visuals loaded from `public/data/cards.json`.
- CSS is central: `public/css/` contains card skin styles and global layout.

## Key files
- `src/App.jsx`: main UI and game flow.
- `src/components/Card.jsx`: interactive card rendering and pointer/animation logic.
- `src/components/CardProxy.jsx`: card metadata normalization and image resolution.
- `src/lib/`: utilities and card metadata (`alternate-arts.json`, `promos.json`).
- `public/data/cards.json`: card dataset loaded at runtime.
- `vite.config.js`: standard Vite setup with React plugin and HTML env substitution.

## Build / dev commands
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Conventions & important notes
- Use `/`-root paths for public assets (e.g. `/img/Dorso.png`, `/click.mp3`).
- Card appearance is driven by CSS custom properties and class names.
- `Card.jsx` updates styles directly on DOM for 60fps animation; avoid unnecessary React re-renders inside that component.
- `CardProxy.jsx` contains custom rarity/foil logic for promo, gallery, alternate-art cards; preserve these mappings when changing card metadata.
- Although `src/lib/components/*.svelte` exist, the current entrypoint is React; treat them as non-primary unless a later change integrates Svelte.

## What to avoid
- Do not assume tests or CI configs exist.
- Do not change the public asset path strategy unless explicitly updating asset routing.
- Do not refactor animation timing without verifying visual behavior in the browser.
