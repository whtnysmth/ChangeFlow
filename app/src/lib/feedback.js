// Click feedback: currently haptic-only. The tap sound was removed 2026-09-30
// (Whitney wants to revisit sound options later) — this keeps the wiring so a
// sound can be dropped back in without touching App.jsx.
let ctx = null

function audio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function softTap() {
  // Click feedback parked 2026-09-30 — Whitney removed both the sound and
  // the haptic for now. Wiring in App.jsx stays so either can return later.
  // Sound audition winner was "Bubble" (sine 480→920Hz, ~90ms); haptic was
  // navigator.vibrate(8).
}
