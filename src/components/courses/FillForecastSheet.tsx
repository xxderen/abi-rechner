import { useState } from 'react'
import type { FillStrategy } from '../../logic/forecast'
import { countEmptyForecastCells } from '../../logic/forecast'
import type { AppState } from '../../logic/types'
import { PointsInput, Sheet } from '../ui'

interface Props {
  state: AppState
  onFill: (strategy: FillStrategy) => void
  onClose: () => void
}

export function FillForecastSheet({ state, onFill, onClose }: Props) {
  const [mode, setMode] = useState<'subject-average' | 'fixed'>('subject-average')
  const [value, setValue] = useState<number | null>(10)
  const empty = countEmptyForecastCells(state)
  const strategy: FillStrategy | null =
    value === null ? null : mode === 'fixed' ? { kind: 'fixed', value } : { kind: 'subject-average', fallback: value }

  return (
    <Sheet
      title="Leere Prognosefelder füllen"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={empty === 0 || strategy === null}
            onClick={() => strategy && onFill(strategy)}
          >
            {empty === 1 ? '1 Feld füllen' : `${empty} Felder füllen`}
          </button>
        </>
      }
    >
      {empty === 0 ? (
        <p>Es gibt keine leeren Felder in Halbjahren ohne Zeugnis.</p>
      ) : (
        <div className="form-grid">
          <p className="muted">
            Gefüllt werden nur leere Felder in Halbjahren ohne Zeugnis. Die Werte sind Prognosen und lassen sich jederzeit
            ändern.
          </p>
          <label className="check">
            <input type="radio" name="fill-mode" checked={mode === 'subject-average'} onChange={() => setMode('subject-average')} />
            <span>Mit dem bisherigen Schnitt des jeweiligen Fachs (gerundet)</span>
          </label>
          <label className="check">
            <input type="radio" name="fill-mode" checked={mode === 'fixed'} onChange={() => setMode('fixed')} />
            <span>Überall mit demselben Wert</span>
          </label>
          <div className="field field--inline">
            <span className="field__label">
              {mode === 'fixed' ? 'Wert' : 'Wert für Fächer ohne bisherige Noten'}
            </span>
            <PointsInput value={value} onChange={setValue} label="Punkte für die Prognose" />
          </div>
        </div>
      )}
    </Sheet>
  )
}
