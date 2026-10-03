import { useState } from 'react'

const base = import.meta.env.BASE_URL

/** Platzhalter, solange public/logo-schule.png fehlt */
function LogoFallback() {
  return (
    <svg className="logo" viewBox="0 0 64 64" role="img" aria-label="Hildegardis-Schule Hagen">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2B4C9B" />
          <stop offset="1" stopColor="#3AA6B9" />
        </linearGradient>
      </defs>
      <path d="M32 3 L57 12 V31 C57 46 46 56 32 61 C18 56 7 46 7 31 V12 Z" fill="url(#logo-grad)" />
      <path d="M32 3 L57 12 V31 C57 46 46 56 32 61 C18 56 7 46 7 31 V12 Z" fill="none" stroke="#F2B705" strokeWidth="2.5" />
      <text x="32" y="41" textAnchor="middle" fontSize="27" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
        H
      </text>
      <circle cx="46" cy="18" r="4" fill="#D7263D" />
    </svg>
  )
}

function SchoolLogo() {
  const [failed, setFailed] = useState(false)
  if (failed) return <LogoFallback />
  return (
    <img
      className="logo"
      src={`${base}logo-schule.png`}
      alt="Logo der Hildegardis-Schule Hagen"
      onError={() => setFailed(true)}
    />
  )
}

/** Optionales zweites Logo – erscheint nur, wenn die Datei vorhanden ist */
function DioceseLogo() {
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')
  if (state === 'missing') return null
  return (
    <img
      className="logo logo--secondary"
      src={`${base}logo-erzbistum.png`}
      alt="Logo des Erzbistums"
      style={state === 'loading' ? { visibility: 'hidden' } : undefined}
      onLoad={() => setState('ok')}
      onError={() => setState('missing')}
    />
  )
}

export function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <SchoolLogo />
        <div className="header__text">
          <h1>Abi-Rechner</h1>
          <p className="header__school">Hildegardis-Schule Hagen</p>
          <p className="header__sub">Zulassung · Abiturprüfungen · Abiturnote (APO-GOSt NRW)</p>
        </div>
        <DioceseLogo />
      </div>
      <div className="brand-line" aria-hidden="true" />
    </header>
  )
}
