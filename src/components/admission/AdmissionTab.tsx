import type { Dispatch } from 'react'
import { useState } from 'react'
import type { AdmissionStatus } from '../../logic/admission'
import type { Computed } from '../../logic/compute'
import { courseLabel } from '../../logic/courses'
import { formatDecimal2 } from '../../logic/points'
import type { AppState } from '../../logic/types'
import type { Action } from '../../state/reducer'
import type { TabId } from '../../state/useHashTab'
import { FillForecastSheet } from '../courses/FillForecastSheet'
import { Card, cx, StatusIcon } from '../ui'
import { CountTable } from './CountTable'
import { SelectionGrid } from './SelectionGrid'

interface Props {
  state: AppState
  dispatch: Dispatch<Action>
  computed: Computed
  onNavigate: (tab: TabId) => void
}

const BANNER: Record<AdmissionStatus, { tone: string; title: string; text: string }> = {
  admitted: { tone: 'ok', title: 'Zugelassen ✔', text: 'Alle Zulassungsvoraussetzungen sind erfüllt.' },
  'admitted-pending-hours': {
    tone: 'warn',
    title: 'Zugelassen, sofern Ø 34 Wochenstunden',
    text: 'Alles andere ist erfüllt. Bestätige unten die Wochenstunden, wenn sie passen.',
  },
  'not-admitted': { tone: 'fail', title: 'Nicht zugelassen ✘', text: 'Mindestens eine Voraussetzung ist nicht erfüllt – Details unten.' },
  open: { tone: 'open', title: 'Noch offen', text: 'Für die Berechnung fehlen noch Noten oder Prognosen.' },
}

export function AdmissionTab({ state, dispatch, computed, onNavigate }: Props) {
  const [filling, setFilling] = useState(false)
  const { admission, optimizer } = computed
  const banner = BANNER[admission.status]
  const selection = optimizer.display

  return (
    <div className="stack">
      <div className={cx('banner', `banner--${banner.tone}`)} role="status">
        <strong className="banner__title">{banner.title}</strong>
        <span>{banner.text}</span>
      </div>

      {optimizer.status === 'incomplete' && (
        <Card title="Noch nicht berechenbar">
          <p>
            {optimizer.missing.length === 1 ? 'Ein belegter Kurs hat' : `${optimizer.missing.length} belegte Kurse haben`} noch
            keine Note oder Prognose:
          </p>
          <p className="missing-list">
            {optimizer.missing.slice(0, 16).map((c) => courseLabel(c)).join(' · ')}
            {optimizer.missing.length > 16 && ` · … (+${optimizer.missing.length - 16})`}
          </p>
          <div className="row-actions row-actions--start">
            <button type="button" className="btn btn--primary" onClick={() => setFilling(true)}>
              Leere Prognosefelder füllen…
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onNavigate('kurse')}>
              Zu Kurse & Noten
            </button>
          </div>
        </Card>
      )}

      <Card title="Zulassungsvoraussetzungen">
        <ol className="criteria">
          {admission.criteria.map((c) => (
            <li key={c.id} className={cx('criteria__item', `criteria__item--${c.status}`)}>
              <StatusIcon status={c.status} />
              <div className="criteria__body">
                <strong>
                  {c.id}. {c.title}
                </strong>
                <span className="criteria__detail">{c.detail}</span>
                {c.messages.length > 0 && (
                  <ul className="criteria__messages">
                    {c.messages.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                )}
                {c.id === 2 && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={state.settings.weeklyHoursOk}
                      onChange={(e) => dispatch({ type: 'setSettings', patch: { weeklyHoursOk: e.currentTarget.checked } })}
                    />
                    <span>Ich habe im Schnitt mindestens 34 Wochenstunden.</span>
                  </label>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {selection && (
        <>
          <Card title="Block I">
            <div className="score">
              <span className={cx('score__value', !selection.feasible && 'score__value--fail')}>{selection.blockI}</span>
              <span className="score__max">/ 600</span>
            </div>
            <p className="formula">
              P = {selection.P} Punkte, S = {selection.S} ({selection.count} Kurse, LK doppelt) → Schnitt{' '}
              {formatDecimal2(selection.P / selection.S)} → Block I = round({selection.P} / {selection.S} × 40) ={' '}
              <strong>{selection.blockI}</strong>
            </p>
            <p className="muted">
              {selection.pflichtCount} Pflichtkurse + {selection.count - selection.pflichtCount} zusätzlich ·{' '}
              {selection.deficits} {selection.deficits === 1 ? 'Defizit' : 'Defizite'} (max. {selection.maxDeficits}), davon{' '}
              {selection.lkDeficits} im LK (max. 3)
              {optimizer.best === null && ' · keine zulässige Einbringung möglich'}
            </p>
            {selection.variant.choices.length > 0 && (
              <dl className="choices">
                {selection.variant.choices.map((c) => (
                  <div key={`${c.label}-${c.value}`} className="choices__item">
                    <dt>{c.label}</dt>
                    <dd>{c.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="muted small">
              Der Optimierer hat {optimizer.variantCount}{' '}
              {optimizer.variantCount === 1 ? 'Pflicht-Variante' : 'Pflicht-Varianten'} und jede Anzahl von 35 bis 40 Kursen
              durchgerechnet und die beste Einbringung gewählt.
            </p>
          </Card>

          <Card title="Eingebrachte Kurse" subtitle="Tippe auf einen Kurs, um zu sehen, warum er (nicht) eingebracht wird.">
            <SelectionGrid state={state} courses={computed.courses} selection={selection} />
          </Card>

          <Card title="Anzahl eingebrachter Kurse" subtitle="Ein zusätzlicher Kurs lohnt sich nur, wenn er über dem Schnitt liegt.">
            <CountTable optimizer={optimizer} />
          </Card>
        </>
      )}

      {filling && (
        <FillForecastSheet
          state={state}
          onClose={() => setFilling(false)}
          onFill={(strategy) => {
            dispatch({ type: 'fillForecasts', strategy })
            setFilling(false)
          }}
        />
      )}
    </div>
  )
}
