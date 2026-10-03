import type { Dispatch } from 'react'
import { useState } from 'react'
import type { AbiFach, ProjectMode, Subject, SubjectType } from '../../logic/types'
import { PROJECT_MODE_LABELS, SEMESTERS, SEMESTER_LABELS, SUBJECT_TYPES, SUBJECT_TYPE_LABELS } from '../../logic/types'
import type { Action } from '../../state/reducer'
import { cx, Sheet } from '../ui'

interface Props {
  subject: Subject
  subjects: Subject[]
  dispatch: Dispatch<Action>
  onClose: () => void
}

const ABI_LABELS: Record<AbiFach, string> = {
  1: '1. Abifach (LK)',
  2: '2. Abifach (LK)',
  3: '3. Abifach (schriftl.)',
  4: '4. Abifach (mündlich)',
}

export function SubjectEditor({ subject, subjects, dispatch, onClose }: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const special = subject.type === 'PK' || subject.type === 'VTF'
  const index = subjects.findIndex((s) => s.id === subject.id)
  const update = (patch: Extract<Action, { type: 'updateSubject' }>['patch']) =>
    dispatch({ type: 'updateSubject', subjectId: subject.id, patch })

  const holderOf = (k: AbiFach) => subjects.find((s) => s.abiFach === k && s.id !== subject.id)

  return (
    <Sheet
      title={subject.name || 'Fach bearbeiten'}
      onClose={onClose}
      footer={
        <>
          {confirmRemove ? (
            <>
              <span className="sheet__confirm">{subject.name} wirklich entfernen?</span>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmRemove(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  dispatch({ type: 'removeSubject', subjectId: subject.id })
                  onClose()
                }}
              >
                Entfernen
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn--danger-ghost" onClick={() => setConfirmRemove(true)}>
                Fach entfernen
              </button>
              <button type="button" className="btn btn--primary" onClick={onClose}>
                Fertig
              </button>
            </>
          )}
        </>
      }
    >
      <div className="form-grid">
        <div className="form-row">
          <label className="field field--grow">
            <span className="field__label">Name</span>
            <input type="text" value={subject.name} onChange={(e) => update({ name: e.currentTarget.value })} />
          </label>
          <label className="field field--short">
            <span className="field__label">Kürzel</span>
            <input
              type="text"
              value={subject.short}
              maxLength={4}
              onChange={(e) => update({ short: e.currentTarget.value.toUpperCase() })}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Fachtyp (bestimmt die Pflicht-Regeln)</span>
          <select
            value={subject.type}
            onChange={(e) =>
              dispatch({ type: 'setSubjectType', subjectId: subject.id, subjectType: e.currentTarget.value as SubjectType })
            }
          >
            {SUBJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {SUBJECT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        {!special && (
          <div className="form-row">
            <div className="field">
              <span className="field__label">Kursart</span>
              <div className="segmented" role="group" aria-label="Kursart">
                {(['GK', 'LK'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={cx('segmented__btn', subject.level === level && 'segmented__btn--active')}
                    aria-pressed={subject.level === level}
                    onClick={() => dispatch({ type: 'setLevel', subjectId: subject.id, level })}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <label className="field field--grow">
              <span className="field__label">Abiturfach</span>
              <select
                value={subject.abiFach ?? ''}
                onChange={(e) => {
                  const value = e.currentTarget.value
                  dispatch({
                    type: 'setAbiFach',
                    subjectId: subject.id,
                    abiFach: value === '' ? null : (Number(value) as AbiFach),
                  })
                }}
              >
                <option value="">kein Abifach</option>
                {([1, 2, 3, 4] as const).map((k) => {
                  const holder = holderOf(k)
                  return (
                    <option key={k} value={k}>
                      {ABI_LABELS[k]}
                      {holder ? ` – statt ${holder.short || holder.name}` : ''}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>
        )}

        <fieldset className="field">
          <legend className="field__label">Belegt in</legend>
          <div className="check-row">
            {SEMESTERS.map((sem) => (
              <label key={sem} className="check check--box">
                <input
                  type="checkbox"
                  checked={subject.taken[sem]}
                  onChange={(e) => {
                    const taken = [...subject.taken] as Subject['taken']
                    taken[sem] = e.currentTarget.checked
                    update({ taken })
                  }}
                />
                <span>{SEMESTER_LABELS[sem]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {subject.type === 'FS' && (
          <label className="check">
            <input
              type="checkbox"
              checked={subject.newLanguage ?? false}
              onChange={(e) => update({ newLanguage: e.currentTarget.checked })}
            />
            <span>Neu einsetzende Fremdsprache (ab der EF begonnen)</span>
          </label>
        )}

        {subject.type === 'PK' && (
          <label className="field">
            <span className="field__label">Einbringung des Projektkurses</span>
            <select
              value={subject.projectMode ?? 'auto'}
              onChange={(e) => update({ projectMode: e.currentTarget.value as ProjectMode })}
            >
              {(Object.keys(PROJECT_MODE_LABELS) as ProjectMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {PROJECT_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
            <span className="field__hint">
              Als 2 GK wird der Projektkurs nur gemeinsam eingebracht (bei nur einer Gesamtnote: in beide Halbjahre
              eintragen). Bei „besondere Lernleistung“ fällt er aus Block I; die BLL-Wertung in Block II bildet dieser
              Rechner nicht ab.
            </span>
          </label>
        )}

        {subject.type === 'VTF' && (
          <p className="note">Vertiefungskurse werden nie eingebracht und zählen nicht zu den belegten Kursen.</p>
        )}

        <div className="row-actions row-actions--start">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            disabled={index <= 0}
            onClick={() => dispatch({ type: 'moveSubject', subjectId: subject.id, direction: -1 })}
          >
            ↑ nach oben
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            disabled={index === -1 || index >= subjects.length - 1}
            onClick={() => dispatch({ type: 'moveSubject', subjectId: subject.id, direction: 1 })}
          >
            ↓ nach unten
          </button>
        </div>
      </div>
    </Sheet>
  )
}
