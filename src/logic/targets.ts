/** Was-wäre-wenn: Zielnote und nötiger Schnitt */
import { MAX_BLOCK_I, MIN_BLOCK_I } from './blockI'
import { EXAM_FACTOR, MAX_BLOCK_II, MIN_BLOCK_II } from './blockII'
import type { Course } from './courses'
import { deriveCourses } from './courses'
import { minTotalForGrade } from './grade'
import { optimizeCourses } from './optimizer'
import { buildVariants } from './requirements'
import type { AppState } from './types'

export interface ExamTarget {
  grade: string
  neededTotal: number
  /** nötiger Block II (mindestens 100 – sonst wäre Block II nicht bestanden) */
  neededBlockII: number
  reachable: boolean
  /** nötige Summe der 4 Prüfungsergebnisse in einfacher Wertung (0–60) */
  examPointSum: number
  /** nötiger Schnitt pro Prüfungsfach (0–15) */
  perExamAverage: number
}

/** Zielnote → nötige Gesamtpunkte, nötiger Block II und Schnitt pro Prüfungsfach */
export function examTargetForGrade(grade: string, blockI: number): ExamTarget | null {
  const neededTotal = minTotalForGrade(grade)
  if (neededTotal === null) return null
  const neededBlockII = Math.max(MIN_BLOCK_II, neededTotal - blockI)
  return {
    grade,
    neededTotal,
    neededBlockII,
    reachable: neededBlockII <= MAX_BLOCK_II,
    examPointSum: Math.ceil(neededBlockII / EXAM_FACTOR),
    perExamAverage: neededBlockII / (4 * EXAM_FACTOR),
  }
}

/** Zielnote bei bekanntem Block II → nötiger Block I */
export function blockITargetForGrade(grade: string, blockII: number): { neededBlockI: number; reachable: boolean } | null {
  const neededTotal = minTotalForGrade(grade)
  if (neededTotal === null) return null
  const neededBlockI = Math.max(MIN_BLOCK_I, neededTotal - blockII)
  return { neededBlockI, reachable: neededBlockI <= MAX_BLOCK_I }
}

/**
 * Vorschlag für ein Block-I-Ziel, wenn die Prüfungen ungefähr so gut laufen wie die
 * Kurse: Bei gleichem Schnitt ist Block II = Block I / 2, also Gesamt = 1,5 × Block I.
 */
export function balancedBlockITarget(grade: string): number | null {
  const neededTotal = minTotalForGrade(grade)
  if (neededTotal === null) return null
  return Math.min(MAX_BLOCK_I, Math.max(MIN_BLOCK_I, Math.ceil((2 * neededTotal) / 3)))
}

/** Kurse ohne feste Zeugnisnote: Halbjahre ohne Zeugnis oder noch leere Felder */
export function isRemaining(course: Course): boolean {
  return course.includable && (course.isForecast || course.points === null)
}

export type RemainingStatus = 'no-remaining' | 'reachable' | 'already-safe' | 'unreachable'

export interface RemainingResult {
  status: RemainingStatus
  remainingCount: number
  /** nötiger Schnitt in den restlichen Kursen, auf 0,1 aufgerundet */
  requiredAverage: number | null
  /** Block I, wenn alle restlichen Kurse genau diesen Schnitt haben */
  blockIAtRequired: number | null
  /** Block I mit 15 Punkten in allen restlichen Kursen (null = auch dann keine zulässige Einbringung) */
  maxBlockI: number | null
}

function remainingEvaluator(state: AppState) {
  const courses = deriveCourses(state)
  const remainingIds = new Set(courses.filter(isRemaining).map((c) => c.id))
  const variants = buildVariants(state)
  return {
    remainingCount: remainingIds.size,
    /** bester zulässiger Block I, wenn alle restlichen Kurse genau `average` Punkte haben */
    blockIAt(average: number): number | null {
      const modified = courses.map((c) => (remainingIds.has(c.id) ? { ...c, points: average } : c))
      return optimizeCourses(modified, variants).best?.blockI ?? null
    },
  }
}

/** Block I, wenn alle Kurse ohne Zeugnisnote genau `average` Punkte haben (null = nicht zulässig) */
export function blockIWithRemainingAverage(state: AppState, average: number): number | null {
  return remainingEvaluator(state).blockIAt(average)
}

/**
 * Welcher Schnitt ist in allen Kursen ohne Zeugnisnote nötig, damit Block I das Ziel
 * erreicht? Annahme: alle restlichen Kurse gleich gut. Gerechnet wird mit dem
 * kompletten Optimierer (Pflichtkurse, Defizitgrenzen, 0-Punkte-Regel), per
 * Binärsuche – Block I steigt mit dem Schnitt nie ab.
 */
export function requiredAverageForBlockI(state: AppState, target: number): RemainingResult {
  const { remainingCount, blockIAt } = remainingEvaluator(state)
  if (remainingCount === 0) {
    return { status: 'no-remaining', remainingCount: 0, requiredAverage: null, blockIAtRequired: null, maxBlockI: null }
  }
  const meets = (average: number): boolean => {
    const blockI = blockIAt(average)
    return blockI !== null && blockI >= target
  }

  const base = { remainingCount, maxBlockI: blockIAt(15) }
  if (!meets(15)) return { ...base, status: 'unreachable', requiredAverage: null, blockIAtRequired: null }
  if (meets(0)) return { ...base, status: 'already-safe', requiredAverage: 0, blockIAtRequired: blockIAt(0) }

  let low = 0
  let high = 15
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2
    if (meets(mid)) high = mid
    else low = mid
  }
  let required = Math.min(15, Math.ceil(high * 10 - 1e-9) / 10)
  while (required < 15 && !meets(required)) required = Math.round(required * 10 + 1) / 10
  if (required > 0 && meets(Math.round(required * 10 - 1) / 10)) required = Math.round(required * 10 - 1) / 10
  return { ...base, status: 'reachable', requiredAverage: required, blockIAtRequired: blockIAt(required) }
}
