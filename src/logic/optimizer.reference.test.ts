/**
 * Gegenprobe: Der Optimierer muss für jede Kursanzahl 35–40 dasselbe Optimum finden wie
 * eine unabhängige Vollsuche. Die Vollsuche probiert bei jeder Gruppe („2 Kurse aus …“)
 * wörtlich alle Kombinationen durch und wählt die freien Kurse per exakter dynamischer
 * Programmierung (maximale Punktsumme unter der Defizitgrenze) – ohne Greedy.
 */
import { describe, expect, it } from 'vitest'
import { blockIScore, deficitLimit, MAX_COURSES, MAX_LK_DEFICITS, MIN_COURSES } from './blockI'
import { createSubject } from './catalog'
import { deriveCourses } from './courses'
import { optimizeCourses } from './optimizer'
import { buildVariants } from './requirements'
import { seededRandom, TEMPLATE_IDS, templateWith } from './test-helpers'
import type { AbiFach, AppState, Level, Quad, SubjectType } from './types'

function* combinations<T>(items: T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) {
    yield [...acc]
    return
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    acc.push(items[i])
    yield* combinations(items, k, i + 1, acc)
    acc.pop()
  }
}

function cartesian<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])), [[]])
}

/** dp[k][d] = maximale Punktsumme mit genau k Kursen und genau d Defiziten */
function freeTable(pool: number[], kMax: number, dMax: number): number[][] {
  const dp = Array.from({ length: kMax + 1 }, () => new Array<number>(dMax + 1).fill(-Infinity))
  dp[0][0] = 0
  for (const points of pool) {
    const deficit = points < 5 ? 1 : 0
    for (let k = kMax; k >= 1; k--) {
      for (let d = dMax; d >= deficit; d--) {
        const previous = dp[k - 1][d - deficit]
        if (previous + points > dp[k][d]) dp[k][d] = previous + points
      }
    }
  }
  return dp
}

interface Ref {
  P: number
  S: number
}

/** Bestes (P, S) je Kursanzahl per Vollsuche; null = keine zulässige Auswahl */
function reference(state: AppState): Map<number, Ref | null> {
  const courses = deriveCourses(state)
  const byId = new Map(courses.map((c) => [c.id, c]))
  const points = (id: string) => byId.get(id)!.points!
  const best = new Map<number, Ref | null>()
  for (let n = MIN_COURSES; n <= MAX_COURSES; n++) best.set(n, null)

  for (const variant of buildVariants(state)) {
    if (variant.problems.length > 0) continue
    const fixed = [...variant.fixed.keys()]
    if (fixed.some((id) => points(id) === 0)) continue
    const choices = variant.groups.map((g) => {
      const need = Math.max(0, g.need - g.courseIds.filter((id) => variant.fixed.has(id)).length)
      const open = g.courseIds.filter((id) => !variant.fixed.has(id))
      return [...combinations(open, need)].filter((combo) => combo.every((id) => points(id) > 0))
    })
    if (choices.some((c) => c.length === 0)) continue

    for (const picks of cartesian(choices)) {
      const pflicht = new Set([...fixed, ...picks.flat()])
      let P = 0
      let S = 0
      let deficits = 0
      let lkDeficits = 0
      for (const id of pflicht) {
        const course = byId.get(id)!
        P += course.points! * course.weight
        S += course.weight
        if (course.points! < 5) {
          deficits += 1
          if (course.isLK) lkDeficits += 1
        }
      }
      if (lkDeficits > MAX_LK_DEFICITS) continue
      const pool = courses.filter((c) => c.includable && c.type !== 'PK' && !pflicht.has(c.id) && c.points! > 0)
      if (pool.some((c) => c.weight !== 1)) throw new Error('Freie Kurse müssen Gewicht 1 haben')
      const kMax = Math.max(0, MAX_COURSES - pflicht.size)
      const table = freeTable(
        pool.map((c) => c.points!),
        kMax,
        8,
      )
      for (let n = MIN_COURSES; n <= MAX_COURSES; n++) {
        const k = n - pflicht.size
        const allowed = deficitLimit(n) - deficits
        if (k < 0 || k > kMax || allowed < 0) continue
        const freeSum = Math.max(...table[k].slice(0, allowed + 1))
        if (freeSum === -Infinity) continue
        const candidate = { P: P + freeSum, S: S + k }
        const current = best.get(n)
        if (!current || candidate.P * current.S > current.P * candidate.S) best.set(n, candidate)
      }
    }
  }
  return best
}

function randomPoints(random: () => number): Quad<number> {
  const one = () => {
    const r = random()
    if (r < 0.03) return 0
    if (r < 0.18) return 1 + Math.floor(random() * 4)
    return 5 + Math.floor(random() * 11)
  }
  return [one(), one(), one(), one()]
}

function extendedState(random: () => number): AppState {
  const subject = (id: string, name: string, short: string, type: SubjectType, level: Level = 'GK', abiFach: AbiFach | null = null) => ({
    ...createSubject({ id, name, short, type }),
    level,
    abiFach,
    points: randomPoints(random),
  })
  return {
    version: 1,
    subjects: [
      subject('m', 'Mathematik', 'M', 'M', 'LK', 1),
      subject('e', 'Englisch', 'E', 'FS', 'LK', 2),
      subject('d', 'Deutsch', 'D', 'D', 'GK', 3),
      subject('ge', 'Geschichte', 'GE', 'GE', 'GK', 4),
      subject('f', 'Französisch', 'F', 'FS'),
      subject('ku', 'Kunst', 'KU', 'KU'),
      subject('mu', 'Musik', 'MU', 'MU'),
      subject('sw', 'Sozialwissenschaften', 'SW', 'SW'),
      subject('pl', 'Philosophie', 'PL', 'PL'),
      subject('kr', 'Katholische Religionslehre', 'KR', 'REL'),
      subject('bi', 'Biologie', 'BI', 'BI'),
      subject('ph', 'Physik', 'PH', 'PH'),
      subject('sp', 'Sport', 'SP', 'SP'),
    ],
    settings: {
      schwerpunkt: 'sprachlich',
      philosophyReplacesReligion: false,
      weeklyHoursOk: true,
      semesterFinal: [true, true, true, true],
    },
    exams: { written: [null, null, null], oral: [null, null, null], fourth: null },
    goals: { targetGrade: '1,0', blockITarget: null },
  }
}

function compareWithReference(state: AppState): { feasibleCounts: number } {
  const result = optimizeCourses(deriveCourses(state), buildVariants(state))
  const ref = reference(state)
  let feasibleCounts = 0
  let refBest: Ref | null = null
  for (const { count, selection } of result.perCount) {
    const expected = ref.get(count) ?? null
    if (expected === null) {
      expect(selection.feasible, `n = ${count}: Vollsuche findet keine zulässige Auswahl`).toBe(false)
      continue
    }
    feasibleCounts += 1
    expect(selection.feasible, `n = ${count}: Optimierer muss zulässig sein`).toBe(true)
    expect(selection.P * expected.S, `n = ${count}: gleicher Schnitt`).toBe(expected.P * selection.S)
    expect(selection.blockI).toBe(blockIScore(expected.P, expected.S))
    if (!refBest || expected.P * refBest.S > refBest.P * expected.S) refBest = expected
  }
  if (refBest === null) {
    expect(result.best).toBeNull()
  } else {
    expect(result.best).not.toBeNull()
    expect(result.best!.P * refBest.S).toBe(refBest.P * result.best!.S)
  }
  return { feasibleCounts }
}

describe('Optimierer = Vollsuche (Zufallsnoten)', () => {
  it('Vorlage: 200 zufällige Notenverteilungen', () => {
    const random = seededRandom(2027)
    let feasibleCounts = 0
    for (let i = 0; i < 200; i++) {
      const points = Object.fromEntries(TEMPLATE_IDS.map((id) => [id, randomPoints(random)]))
      feasibleCounts += compareWithReference(templateWith(points)).feasibleCounts
    }
    // Die Stichprobe soll viele zulässige Fälle enthalten, sonst wäre der Test wertlos.
    expect(feasibleCounts).toBeGreaterThan(300)
  })

  it('Belegung mit mehr Wahlmöglichkeiten (KU+MU, GE/SW/PL, sprachlicher Schwerpunkt): 60 Fälle', () => {
    const random = seededRandom(42)
    let feasibleCounts = 0
    for (let i = 0; i < 60; i++) feasibleCounts += compareWithReference(extendedState(random)).feasibleCounts
    expect(feasibleCounts).toBeGreaterThan(60)
  })
})
