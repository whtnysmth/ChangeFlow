// Click feedback: a soft synthesized tap + a light haptic where supported.
// No audio assets — the Web Audio API builds the sound on the fly, so the
// tap is always the same and costs nothing to ship.
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

  const ac = audio()
  if (!ac) return
  try {
    const t = ac.currentTime
    // A gentle downward "tup": sine gliding 740 -> 520 Hz, fast soft attack,
    // ~160ms decay. Quiet by design.
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(740, t)
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.09)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.18)
  } catch {}
}
