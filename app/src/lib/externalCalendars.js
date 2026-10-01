// externalCalendars.js — the seam for read-only external calendar sources.
// Google Calendar (via Google Identity Services + Calendar API v3) is live now,
// client-side only, no backend. M365/Outlook (Microsoft Graph) plugs in here later.
//
// M365 TODO: add an msal.js-based provider mirroring the Google provider below —
// register an Azure app (delegated Calendars.Read), acquire a token with MSAL's
// acquireTokenSilent/popup, and map Graph /me/calendarview events to the same
// { id, title, start, end, allDay } shape returned by listGoogleEvents().

const GCAL_TOKEN_KEY = 'changeflow:gcal:token'
const GIS_SCRIPT = 'https://accounts.google.com/gsi/client'
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Normalized event shape every provider returns:
// { id, title, start (ISO string), end (ISO string | null), allDay (bool), source }

function readToken() {
  try {
    return JSON.parse(localStorage.getItem(GCAL_TOKEN_KEY) || 'null')
  } catch {
    return null
  }
}

function writeToken(tok) {
  try {
    if (tok) localStorage.setItem(GCAL_TOKEN_KEY, JSON.stringify(tok))
    else localStorage.removeItem(GCAL_TOKEN_KEY)
  } catch (err) {
    console.warn('Could not persist Google token:', err.message)
  }
}

export function getGoogleStatus() {
  if (!GOOGLE_CLIENT_ID) return 'unconfigured'
  const tok = readToken()
  if (!tok?.access_token) return 'disconnected'
  if (tok.expires_at && Date.now() > tok.expires_at - 60_000) return 'expired'
  return 'connected'
}

let gisPromise = null
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google)
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = GIS_SCRIPT
      s.async = true
      s.defer = true
      s.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google) : reject(new Error('Google Identity Services failed to load.')))
      s.onerror = () => reject(new Error('Could not load Google sign-in. Check your connection and try again.'))
      document.head.appendChild(s)
    })
  }
  return gisPromise
}

// Opens the Google consent popup and stores the access token. Token lives in
// localStorage only; it is never rendered in the UI or logged.
export async function connectGoogle() {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google Calendar is not configured yet — see setup steps.')
  const google = await loadGis()
  const token = await new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GCAL_SCOPE,
      callback: (resp) => {
        if (resp?.access_token) resolve(resp)
        else reject(new Error(resp?.error || 'Google sign-in was cancelled.'))
      },
      error_callback: (err) => reject(new Error(err?.message || 'Google sign-in failed.')),
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
  writeToken({
    access_token: token.access_token,
    expires_at: Date.now() + (Number(token.expires_in) || 3600) * 1000,
  })
  return true
}

export async function disconnectGoogle() {
  const tok = readToken()
  writeToken(null)
  if (tok?.access_token) {
    // Best-effort revoke; failure here is not fatal.
    fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tok.access_token)}`, { method: 'POST' })
      .catch(() => {})
  }
}

export async function listGoogleEvents({ timeMin, timeMax }) {
  const tok = readToken()
  if (!tok?.access_token) {
    const err = new Error('Google Calendar is not connected.')
    err.code = 'not-connected'
    throw err
  }
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  })
  if (res.status === 401) {
    writeToken(null)
    const err = new Error('Your Google session expired — please reconnect.')
    err.code = 'expired'
    throw err
  }
  if (!res.ok) throw new Error(`Google Calendar request failed (${res.status}).`)
  const json = await res.json()
  return (json.items || [])
    .filter(e => e.status !== 'cancelled')
    .map(e => ({
      id: `gcal-${e.id}`,
      title: e.summary || '(No title)',
      start: e.start?.dateTime || e.start?.date || null,
      end: e.end?.dateTime || e.end?.date || null,
      allDay: !e.start?.dateTime,
      source: 'google',
    }))
    .filter(e => e.start)
}
