/** Leere Prognosefelder (Halbjahre ohne Zeugnis) schnell füllen */
import { subjectIncludable } from './courses'
import { roundHalfUpFraction } from './points'
import type { AppState, Subject } from './types'
import { SEMESTERS } from './types'

export type FillStrategy =
  /** Schnitt der schon eingetragenen Punkte des Fachs (gerundet); ohne Werte: fallback */
  | { kind: 'subject-average'; fallback: number }
  | { kind: 'fixed'; value: number }

function isEmptyForecastCell(state: AppState, subject: Subject, sem: number): boolean {
  return (
    subjectIncludable(subject) &&
    subject.taken[sem] &&
    !state.settings.semesterFinal[sem] &&
    subject.points[sem] === null
  )
}

export function countEmptyForecastCells(state: AppState): number {
  let count = 0
  for (const subject of state.subjects) {
    for (const sem of SEMESTERS) if (isEmptyForecastCell(state, subject, sem)) count += 1
  }
  return count
}

/** Gerundeter Schnitt der eingetragenen Punkte eines Fachs (belegte Halbjahre), null wenn keine */
export function subjectAverage(subject: Subject): number | null {
  const values = SEMESTERS.filter((sem) => subject.taken[sem])
    .map((sem) => subject.points[sem])
    .filter((p): p is number => p !== null)
  if (values.length === 0) return null
  return roundHalfUpFraction(values.reduce((a, b) => a + b, 0), values.length)
}

export function fillEmptyForecasts(state: AppState, strategy: FillStrategy): { state: AppState; filled: number } {
  let filled = 0
  const subjects = state.subjects.map((subject) => {
    const value = strategy.kind === 'fixed' ? strategy.value : (subjectAverage(subject) ?? strategy.fallback)
    let changed = false
    const points = [...subject.points] as Subject['points']
    for (const sem of SEMESTERS) {
      if (isEmptyForecastCell(state, subject, sem)) {
        points[sem] = value
        filled += 1
        changed = true
      }
    }
    return changed ? { ...subject, points } : subject
  })
  return { state: { ...state, subjects }, filled }
}
