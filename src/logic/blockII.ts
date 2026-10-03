/** Block II – Abiturprüfungen (laut Schulpräsentation) */
import { roundHalfUpFraction } from './points'
import type { Exams } from './types'

/** Jedes Prüfungsergebnis zählt 5-fach. */
export const EXAM_FACTOR = 5
/** Mindestens 25 Punkte (nach 5-facher Wertung) in mindestens 2 Fächern, darunter ein LK */
export const MIN_SUBJECT_RESULT = 25
export const MIN_BLOCK_II = 100
export const MAX_BLOCK_II = 300

export type Quartet = [number, number, number, number]

/** Ergebnis ohne Nachprüfung: Punkte × 5 */
export function examPoints(points: number): number {
  return points * EXAM_FACTOR
}

/**
 * Mündliche Nachprüfung im 1.–3. Fach: (2 × schriftlich + mündlich) / 3 × 5,
 * gerundet wird erst zum Schluss. Beispiel: 6 schriftlich, 8 mündlich → 33,33 → 33.
 */
export function oralExamResult(written: number, oral: number): number {
  return roundHalfUpFraction((2 * written + oral) * EXAM_FACTOR, 3)
}

export function subjectResult(written: number, oral: number | null): number {
  return oral === null ? examPoints(written) : oralExamResult(written, oral)
}

export interface BlockIIEvaluation {
  results: Quartet
  sum: number
  passed: boolean
  conditions: { twoSubjects25: boolean; lk25: boolean; sum100: boolean }
  messages: string[]
}

/**
 * Bestanden, wenn mind. 2 Prüfungsfächer jeweils ≥ 25 Punkte haben, darunter mind. 1 LK
 * (Fach 1 oder 2), und die Summe ≥ 100 ist.
 */
export function evaluateBlockII(results: Quartet): BlockIIEvaluation {
  const sum = results[0] + results[1] + results[2] + results[3]
  const reached = results.filter((r) => r >= MIN_SUBJECT_RESULT).length
  const twoSubjects25 = reached >= 2
  const lk25 = results[0] >= MIN_SUBJECT_RESULT || results[1] >= MIN_SUBJECT_RESULT
  const sum100 = sum >= MIN_BLOCK_II
  const messages: string[] = []
  if (!twoSubjects25) {
    messages.push(`Nur ${reached} Prüfungsfach${reached === 1 ? '' : 'er'} mit mindestens 25 Punkten – mindestens 2 nötig.`)
  }
  if (!lk25) messages.push('Kein Leistungskurs (1. oder 2. Fach) mit mindestens 25 Punkten.')
  if (!sum100) messages.push(`Summe ${sum} Punkte – mindestens 100 nötig.`)
  return { results, sum, passed: twoSubjects25 && lk25 && sum100, conditions: { twoSubjects25, lk25, sum100 }, messages }
}

/** voluntary = schon ohne Nachprüfung bestanden; mandatory = nur mit Nachprüfung; impossible = auch so nicht */
export type OralNeed = 'voluntary' | 'mandatory' | 'impossible'

export interface BlockIIStatus {
  complete: boolean
  /** Ergebnisse je Fach inkl. eingetragener Nachprüfungen; null = fehlt */
  results: [number | null, number | null, number | null, number | null]
  /** mit den eingetragenen Nachprüfungen */
  evaluation: BlockIIEvaluation | null
  /** nur schriftlich (bzw. 4. Fach mündlich), ohne Nachprüfungen */
  writtenOnly: BlockIIEvaluation | null
  oralNeed: OralNeed | null
  /** nötige Punkte in einer einzelnen Nachprüfung je Fach 1–3 (null = nicht nötig bzw. reicht allein nicht) */
  minOralToPass: [number | null, number | null, number | null]
}

export function blockIIStatus(exams: Exams): BlockIIStatus {
  const { written, oral, fourth } = exams
  const results: BlockIIStatus['results'] = [
    written[0] === null ? null : subjectResult(written[0], oral[0]),
    written[1] === null ? null : subjectResult(written[1], oral[1]),
    written[2] === null ? null : subjectResult(written[2], oral[2]),
    fourth === null ? null : examPoints(fourth),
  ]
  const [w1, w2, w3] = written
  if (w1 === null || w2 === null || w3 === null || fourth === null) {
    return {
      complete: false,
      results,
      evaluation: null,
      writtenOnly: null,
      oralNeed: null,
      minOralToPass: [null, null, null],
    }
  }

  const w: [number, number, number] = [w1, w2, w3]
  const writtenResults: Quartet = [examPoints(w1), examPoints(w2), examPoints(w3), examPoints(fourth)]
  const writtenOnly = evaluateBlockII(writtenResults)
  const evaluation = evaluateBlockII(results as Quartet)

  let oralNeed: OralNeed = 'voluntary'
  const minOralToPass: BlockIIStatus['minOralToPass'] = [null, null, null]
  if (!writtenOnly.passed) {
    // Mündlich 15 ist in jedem Fach das bestmögliche Ergebnis (nie schlechter als nur schriftlich).
    const bestCase: Quartet = [oralExamResult(w1, 15), oralExamResult(w2, 15), oralExamResult(w3, 15), examPoints(fourth)]
    oralNeed = evaluateBlockII(bestCase).passed ? 'mandatory' : 'impossible'
    for (const i of [0, 1, 2] as const) {
      for (let m = 0; m <= 15; m++) {
        const trial: Quartet = [...writtenResults]
        trial[i] = oralExamResult(w[i], m)
        if (evaluateBlockII(trial).passed) {
          minOralToPass[i] = m
          break
        }
      }
    }
  }

  return { complete: true, results, evaluation, writtenOnly, oralNeed, minOralToPass }
}

export interface OralRow {
  oral: number
  result: number
  /** Differenz zum Ergebnis ohne Nachprüfung */
  diff: number
}

/** „Mündlich – Was bringt's?“: alle mündlichen Ergebnisse 0–15 zu einem schriftlichen Ergebnis */
export function oralTable(written: number): OralRow[] {
  const base = examPoints(written)
  return Array.from({ length: 16 }, (_, oral) => {
    const result = oralExamResult(written, oral)
    return { oral, result, diff: result - base }
  })
}
