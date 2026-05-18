// Shared state for which card is currently active (open/zoomed)
let activeCardEl = null
const listeners = new Set()

export function getActiveCard() { return activeCardEl }

export function setActiveCard(el) {
  activeCardEl = el
  listeners.forEach(fn => fn(el))
}

export function subscribeActiveCard(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
