/** Kleine, wiederverwendbare Bausteine */
import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CriterionStatus } from '../logic/admission'
import { parsePointsInput, pointsToGrade } from '../logic/points'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Punkte-Eingabe 0–15 mit Zifferntastatur und Note darunter */
export function PointsInput(props: {
  value: number | null
  onChange: (points: number | null) => void
  label: string
  forecast?: boolean
  showGrade?: boolean
  className?: string
}) {
  const { value, onChange, label, forecast = false, showGrade = true, className } = props
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(value === null ? '' : String(value))
  }, [value, focused])

  const invalid = parsePointsInput(draft) === undefined

  return (
    <span className={cx('points', forecast && 'points--forecast', invalid && 'points--invalid', className)}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        autoComplete="off"
        enterKeyHint="next"
        aria-label={label}
        aria-invalid={invalid}
        title={forecast ? `${label} (Prognose)` : label}
        value={draft}
        onFocus={(e) => {
          setFocused(true)
          e.currentTarget.select()
        }}
        onChange={(e) => {
          const raw = e.currentTarget.value.replace(/\D/g, '')
          setDraft(raw)
          const parsed = parsePointsInput(raw)
          if (parsed !== undefined) onChange(parsed)
        }}
        onBlur={() => {
          setFocused(false)
          if (parsePointsInput(draft) === undefined) setDraft(value === null ? '' : String(value))
        }}
      />
      {showGrade && (
        <span className="points__grade" aria-hidden="true">
          {value !== null && !invalid ? pointsToGrade(value) : ' '}
        </span>
      )}
    </span>
  )
}

const STATUS_SYMBOL: Record<CriterionStatus, string> = { ok: '✔', fail: '✘', unknown: '?', open: '…' }
const STATUS_TEXT: Record<CriterionStatus, string> = {
  ok: 'erfüllt',
  fail: 'nicht erfüllt',
  unknown: 'nicht bestätigt',
  open: 'noch offen',
}

export function StatusIcon({ status }: { status: CriterionStatus }) {
  return (
    <span className={cx('status-icon', `status-icon--${status}`)} role="img" aria-label={STATUS_TEXT[status]}>
      {STATUS_SYMBOL[status]}
    </span>
  )
}

/** Bottom-Sheet auf dem Handy, Dialog in der Mitte auf großen Bildschirmen */
export function Sheet(props: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { title, onClose, children, footer } = props
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const previousFocus = document.activeElement as HTMLElement | null
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [])

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export function Card(props: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={cx('card', props.className)} id={props.id}>
      {(props.title || props.subtitle) && (
        <header className="card__header">
          {props.title && <h2>{props.title}</h2>}
          {props.subtitle && <p className="muted">{props.subtitle}</p>}
        </header>
      )}
      {props.children}
    </section>
  )
}
