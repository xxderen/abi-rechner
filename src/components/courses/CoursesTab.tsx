import type { Dispatch } from 'react'
import { useState } from 'react'
import type { Computed } from '../../logic/compute'
import { SUBJECT_TYPE_LABELS } from '../../logic/types'
import type { AppState, Sem, Subject } from '../../logic/types'
import { SEMESTERS, SEMESTER_LABELS } from '../../logic/types'
import type { Action } from '../../state/reducer'
import { Card, cx, PointsInput } from '../ui'
import { AddSubjectSheet } from './AddSubjectSheet'
import { DataCard } from './DataCard'
import { SubjectEditor } from './SubjectEditor'

interface Props {
  state: AppState
  dispatch: Dispatch<Action>
  computed: Computed
  storageOk: boolean
}

function SubjectBadges({ subject }: { subject: Subject }) {
  return (
    <span className="badges">
      {subject.level === 'LK' && subject.type !== 'PK' && subject.type !== 'VTF' && <span className="badge badge--lk">LK</span>}
      {subject.abiFach !== null && <span className="badge badge--abi">{subject.abiFach}. Abi</span>}
      {subject.type === 'PK' && <span className="badge badge--pk">PK</span>}
      {subject.type === 'VTF' && <span className="badge badge--muted">zählt nicht</span>}
      {subject.newLanguage && <span className="badge badge--muted">neu ab EF</span>}
    </span>
  )
}

export function CoursesTab({ state, dispatch, computed, storageOk }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const { semesterFinal } = state.settings
  const editingSubject = state.subjects.find((s) => s.id === editing) ?? null

  const toggleFinal = (sem: Sem) => dispatch({ type: 'setSemesterFinal', sem, final: !semesterFinal[sem] })

  return (
    <div className="stack">
      {computed.issues.length > 0 && (
        <div className="issues" role="status">
          <strong>Bitte prüfen:</strong>
          <ul>
            {computed.issues.map((issue, i) => (
              <li key={i} className={cx(issue.level === 'error' && 'issues__error')}>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card
        title="Kurse & Noten"
        subtitle={
          <>
            Punkte 0–15 pro Halbjahr, leer = noch keine Note. Halbjahre ohne Zeugnis gelten als{' '}
            <span className="forecast-word">Prognose</span> – tippe oben auf das Halbjahr, sobald das Zeugnis da ist. Tippe
            auf ein Fach, um es zu bearbeiten.
          </>
        }
      >
        <div className="grade-grid" role="table" aria-label="Noten der Qualifikationsphase">
          <div className="grade-grid__row grade-grid__head" role="row">
            <span className="grade-grid__corner" role="columnheader">
              Fach
            </span>
            {SEMESTERS.map((sem) => (
              <span key={sem} className="sem-head" role="columnheader">
                <button
                  type="button"
                  className={cx('sem-toggle', semesterFinal[sem] ? 'sem-toggle--final' : 'sem-toggle--forecast')}
                  aria-pressed={semesterFinal[sem]}
                  aria-label={`${SEMESTER_LABELS[sem]}: ${semesterFinal[sem] ? 'Zeugnis liegt vor' : 'Prognose'} – umschalten`}
                  onClick={() => toggleFinal(sem)}
                >
                  <span className="sem-toggle__label">{SEMESTER_LABELS[sem]}</span>
                  <span className="sem-toggle__state">{semesterFinal[sem] ? 'Zeugnis' : 'Prognose'}</span>
                </button>
              </span>
            ))}
          </div>

          {state.subjects.map((subject) => (
            <div key={subject.id} className={cx('grade-grid__row', subject.type === 'VTF' && 'grade-grid__row--muted')} role="row">
              <span role="rowheader" className="grade-grid__subject">
                <button
                  type="button"
                  className="subject-cell"
                  onClick={() => setEditing(subject.id)}
                  aria-label={`${subject.name} bearbeiten`}
                  title={`${subject.name} (${SUBJECT_TYPE_LABELS[subject.type]}) bearbeiten`}
                >
                  <span className="subject-cell__short">{subject.short || '?'}</span>
                  <span className="subject-cell__name">{subject.name}</span>
                  <SubjectBadges subject={subject} />
                </button>
              </span>
              {SEMESTERS.map((sem) =>
                subject.taken[sem] ? (
                  <span key={sem} className="grade-grid__cell" role="cell">
                    <PointsInput
                      value={subject.points[sem]}
                      forecast={!semesterFinal[sem]}
                      label={`${subject.name} ${SEMESTER_LABELS[sem]}`}
                      onChange={(points) => dispatch({ type: 'setPoints', subjectId: subject.id, sem, points })}
                    />
                  </span>
                ) : (
                  <span key={sem} className="grade-grid__cell cell-empty" role="cell" title="nicht belegt">
                    <span aria-label="nicht belegt">–</span>
                  </span>
                ),
              )}
            </div>
          ))}

          {state.subjects.length === 0 && <p className="muted grade-grid__empty">Noch keine Fächer – füge unten welche hinzu.</p>}
        </div>

        <div className="row-actions">
          <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
            + Fach hinzufügen
          </button>
        </div>
      </Card>

      <Card title="Einstellungen">
        <div className="form-grid">
          <label className="field">
            <span className="field__label">Schwerpunkt</span>
            <select
              value={state.settings.schwerpunkt}
              onChange={(e) =>
                dispatch({
                  type: 'setSettings',
                  patch: { schwerpunkt: e.currentTarget.value as AppState['settings']['schwerpunkt'] },
                })
              }
            >
              <option value="naturwissenschaftlich">Naturwissenschaftlich-technisch</option>
              <option value="sprachlich">Sprachlich</option>
            </select>
            <span className="field__hint">
              Bestimmt die 2 Q2-Kurse aus dem Schwerpunktfach (weitere Fremdsprache bzw. weiteres Fach aus BI, CH, PH, IF).
              Bei naturwissenschaftlichem Schwerpunkt zählt IF auch als durchgängige Naturwissenschaft.
            </span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={state.settings.philosophyReplacesReligion}
              onChange={(e) => dispatch({ type: 'setSettings', patch: { philosophyReplacesReligion: e.currentTarget.checked } })}
            />
            <span>Philosophie als Ersatzfach für Religion (dann zählen 2 Kurse Philosophie statt Religion)</span>
          </label>
        </div>
      </Card>

      <DataCard state={state} dispatch={dispatch} storageOk={storageOk} />

      {editingSubject && (
        <SubjectEditor
          subject={editingSubject}
          subjects={state.subjects}
          dispatch={dispatch}
          onClose={() => setEditing(null)}
        />
      )}
      {adding && (
        <AddSubjectSheet
          subjects={state.subjects}
          onClose={() => setAdding(false)}
          onAdd={(subject) => {
            dispatch({ type: 'addSubject', subject })
            setAdding(false)
            setEditing(subject.id)
          }}
        />
      )}
    </div>
  )
}
