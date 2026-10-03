/**
 * Best-Case-Optimierer für Block I.
 *
 * Für jede Pflicht-Variante und jede Anzahl n = 35 … 40:
 *  1. Pflichtkurse = feste Kurse der Variante + aus jeder Gruppe („2 Kurse aus …“)
 *     die besten noch fehlenden Kurse mit mehr als 0 Punkten,
 *  2. auffüllen mit den besten übrigen einbringbaren Kursen (nie Vertiefungskurse,
 *     nie Kurse mit 0 Punkten, Projektkurse nur als Paar über die Variante),
 *  3. Defizitgrenzen prüfen und Block I berechnen.
 *
 * Exakt, nicht heuristisch: Alle nicht festen Kurse sind Grundkurse mit Gewicht 1
 * (LK sind als 1./2. Abifach immer Pflicht). Bei fester Variante und festem n ist
 * „n Kurse mit Mindestanzahl je (disjunkter) Gruppe“ eine Matroid-Basis-Aufgabe;
 * „die besten zuerst“ maximiert damit die Punktsumme und minimiert gleichzeitig die
 * Zahl der Defizite. Ein Test vergleicht das Ergebnis mit einer unabhängigen
 * Vollsuche über alle Paar-Kombinationen.
 */
import { blockIScore, checkDeficits, MAX_COURSES, MAX_LK_DEFICITS, MIN_COURSES } from './blockI'
import type { Course } from './courses'
import { compareBestFirst, courseLabel, deriveCourses } from './courses'
import { isDeficit } from './points'
import type { Variant } from './requirements'
import { buildVariants } from './requirements'
import type { AppState } from './types'

export type CourseRole = 'pflicht' | 'zusatz'

export type ViolationCode = 'missing' | 'zero' | 'too-many-pflicht' | 'not-enough' | 'deficits' | 'lk-deficits'

export interface Violation {
  code: ViolationCode
  message: string
}

/** Verstöße gegen die Pflicht-Wertungskurse (Zulassungsvoraussetzung 3) */
export const PFLICHT_CODES: readonly ViolationCode[] = ['missing', 'zero', 'too-many-pflicht']
/** Verstöße bei Anzahl und Defiziten (Zulassungsvoraussetzung 4) */
export const DEFICIT_CODES: readonly ViolationCode[] = ['not-enough', 'deficits', 'lk-deficits']

export interface Selection {
  variant: Variant
  /** angestrebte Anzahl eingebrachter Kurse (35–40) */
  targetCount: number
  /** tatsächlich eingebrachte Kurse (LK einfach gezählt) */
  count: number
  roles: Map<string, CourseRole>
  /** Gründe der Pflichtkurse */
  reasons: Map<string, string[]>
  pflichtCount: number
  /** Punktsumme, LK doppelt */
  P: number
  /** Anzahl Kurse, LK doppelt */
  S: number
  blockI: number
  deficits: number
  lkDeficits: number
  maxDeficits: number
  violations: Violation[]
  feasible: boolean
}

export interface OptimizerResult {
  status: 'ok' | 'incomplete'
  /** einbringbare Kurse ohne Note bzw. Prognose */
  missing: Course[]
  /** beste zulässige Auswahl; null = keine zulässige Auswahl möglich */
  best: Selection | null
  /** beste zulässige Auswahl, sonst die „am wenigsten unzulässige“ (für die Anzeige) */
  display: Selection | null
  /** beste Auswahl je Anzahl eingebrachter Kurse */
  perCount: Array<{ count: number; selection: Selection }>
  variantCount: number
}

interface Context {
  byId: Map<string, Course>
  /** frei wählbare Kandidaten (Punkte > 0, keine Projektkurse), beste zuerst */
  freePool: Course[]
  zeroCourses: number
}

function makeContext(courses: Course[]): Context {
  return {
    byId: new Map(courses.map((c) => [c.id, c])),
    freePool: courses
      .filter((c) => c.includable && c.type !== 'PK' && c.points !== null && c.points > 0)
      .sort(compareBestFirst),
    zeroCourses: courses.filter((c) => c.includable && c.points === 0).length,
  }
}

function addReason(reasons: Map<string, string[]>, id: string, reason: string): void {
  const list = reasons.get(id)
  if (!list) reasons.set(id, [reason])
  else if (!list.includes(reason)) list.push(reason)
}

function evaluate(variant: Variant, targetCount: number, ctx: Context): Selection {
  const violations: Violation[] = variant.problems.map((message) => ({ code: 'missing', message }))
  const reasons = new Map<string, string[]>()

  // 1a. feste Pflichtkurse
  for (const [id, why] of variant.fixed) {
    const course = ctx.byId.get(id)
    if (!course) continue
    reasons.set(id, [...why])
    if (course.points === null) {
      violations.push({ code: 'missing', message: `Pflichtkurs ${courseLabel(course)} hat keine Note.` })
    } else if (course.points === 0) {
      violations.push({
        code: 'zero',
        message: `Pflichtkurs ${courseLabel(course)} hat 0 Punkte – Kurse mit 0 Punkten können nicht eingebracht werden.`,
      })
    }
  }

  // 1b. Gruppen „2 Kurse aus …“: die besten noch fehlenden Kurse mit > 0 Punkten
  for (const group of variant.groups) {
    const already = group.courseIds.filter((id) => reasons.has(id))
    for (const id of already.slice(0, group.need)) addReason(reasons, id, group.label)
    const need = group.need - already.length
    if (need <= 0) continue
    const candidates = group.courseIds
      .filter((id) => !reasons.has(id))
      .map((id) => ctx.byId.get(id))
      .filter((c): c is Course => c !== undefined && c.includable && c.points !== null && c.points > 0)
      .sort(compareBestFirst)
    const picked = candidates.slice(0, need)
    for (const c of picked) reasons.set(c.id, [group.label])
    if (picked.length < need) {
      const zeros = group.courseIds.filter((id) => !reasons.has(id) && ctx.byId.get(id)?.points === 0).length
      const found = already.length + picked.length
      violations.push({
        code: zeros > 0 ? 'zero' : 'missing',
        message:
          group.courseIds.length === 0
            ? `${group.label}: keine passenden Kurse belegt.`
            : `${group.label}: nur ${found} von ${group.need} Kursen einbringbar` +
              (zeros > 0 ? ` (${zeros} mit 0 Punkten zählen nicht).` : '.'),
      })
    }
  }

  const pflichtCount = reasons.size
  const roles = new Map<string, CourseRole>()
  for (const id of reasons.keys()) roles.set(id, 'pflicht')
  if (pflichtCount > targetCount) {
    violations.push({
      code: 'too-many-pflicht',
      message: `${pflichtCount} Pflichtkurse – mehr als ${targetCount} einzubringende Kurse.`,
    })
  }

  // 2. auffüllen mit den besten übrigen Kursen
  const freeSlots = Math.max(0, targetCount - pflichtCount)
  let added = 0
  for (const course of ctx.freePool) {
    if (added >= freeSlots) break
    if (reasons.has(course.id)) continue
    roles.set(course.id, 'zusatz')
    added += 1
  }
  const count = pflichtCount + added
  if (count < targetCount) {
    violations.push({
      code: 'not-enough',
      message:
        `Nur ${count} einbringbare Kurse – für ${targetCount} Kurse fehlen ${targetCount - count}.` +
        (ctx.zeroCourses > 0 ? ' Kurse mit 0 Punkten können nicht eingebracht werden.' : ''),
    })
  }

  // 3. Punkte, Defizite, Block I
  let P = 0
  let S = 0
  let deficits = 0
  let lkDeficits = 0
  for (const id of roles.keys()) {
    const course = ctx.byId.get(id)!
    const points = course.points ?? 0
    P += points * course.weight
    S += course.weight
    if (isDeficit(points)) {
      deficits += 1
      if (course.isLK) lkDeficits += 1
    }
  }
  const deficitCheck = checkDeficits(targetCount, deficits, lkDeficits)
  violations.push(...deficitCheck.issues)

  return {
    variant,
    targetCount,
    count,
    roles,
    reasons,
    pflichtCount,
    P,
    S,
    blockI: blockIScore(P, S),
    deficits,
    lkDeficits,
    maxDeficits: deficitCheck.maxDeficits,
    violations,
    feasible: violations.length === 0,
  }
}

function structuralViolations(s: Selection): number {
  return s.violations.filter((v) => v.code !== 'deficits' && v.code !== 'lk-deficits').length
}

function deficitExcess(s: Selection): number {
  return Math.max(0, s.deficits - s.maxDeficits) + Math.max(0, s.lkDeficits - MAX_LK_DEFICITS)
}

/**
 * true, wenn a besser ist als b: zulässig vor unzulässig; dann höherer exakter
 * Schnitt P/S; bei Gleichstand weniger Defizite, dann weniger Kurse.
 */
export function isBetter(a: Selection, b: Selection): boolean {
  if (a.feasible !== b.feasible) return a.feasible
  if (!a.feasible) {
    const sa = structuralViolations(a)
    const sb = structuralViolations(b)
    if (sa !== sb) return sa < sb
    const da = deficitExcess(a)
    const db = deficitExcess(b)
    if (da !== db) return da < db
  }
  const left = a.P * b.S
  const right = b.P * a.S
  if (left !== right) return left > right
  if (a.deficits !== b.deficits) return a.deficits < b.deficits
  if (a.count !== b.count) return a.count < b.count
  return false
}

export function optimizeCourses(courses: Course[], variants: Variant[]): OptimizerResult {
  const missing = courses.filter((c) => c.includable && c.points === null)
  if (missing.length > 0) {
    return { status: 'incomplete', missing, best: null, display: null, perCount: [], variantCount: variants.length }
  }

  const ctx = makeContext(courses)
  let best: Selection | null = null
  let display: Selection | null = null
  const perCount: OptimizerResult['perCount'] = []

  for (let n = MIN_COURSES; n <= MAX_COURSES; n++) {
    let bestForN: Selection | null = null
    for (const variant of variants) {
      const selection = evaluate(variant, n, ctx)
      if (!bestForN || isBetter(selection, bestForN)) bestForN = selection
    }
    if (!bestForN) continue
    perCount.push({ count: n, selection: bestForN })
    if (bestForN.feasible && (!best || isBetter(bestForN, best))) best = bestForN
    if (!display || isBetter(bestForN, display)) display = bestForN
  }

  return { status: 'ok', missing: [], best, display, perCount, variantCount: variants.length }
}

export function optimize(state: AppState): OptimizerResult {
  return optimizeCourses(deriveCourses(state), buildVariants(state))
}
