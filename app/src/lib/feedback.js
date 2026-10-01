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
  // Haptic: a light 8ms tap. Works on Android Chrome; iOS Safari does not
  // expose haptics to the web, so this silently no-ops there.
  try {
    if (navigator.vibrate) navigator.vibrate(8)
  } catch {}

  // Sound: parked for now — Whitney will revisit. (Previous winner of the
  // sound audition was "Bubble": sine 480→920Hz, ~90ms.)
  void audio
}
