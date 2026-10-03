import { describe, expect, it } from 'vitest'
import {
  balancedBlockITarget,
  blockITargetForGrade,
  blockIWithRemainingAverage,
  examTargetForGrade,
  requiredAverageForBlockI,
} from './targets'
import { allSubjects, templateWith, TEMPLATE_IDS } from './test-helpers'
import type { Quad } from './types'

describe('Zielnote → Block II', () => {
  it('Zielnote 2,0 bei Block I 450 → 193 Punkte in Block II, Ø 9,65 pro Prüfung', () => {
    const target = examTargetForGrade('2,0', 450)!
    expect(target.neededTotal).toBe(643)
    expect(target.neededBlockII).toBe(193)
    expect(target.reachable).toBe(true)
    expect(target.examPointSum).toBe(39)
    expect(target.perExamAverage).toBeCloseTo(9.65)
  })

  it('Zielnote 1,0 bei Block I 450 → nicht erreichbar (373 > 300)', () => {
    const target = examTargetForGrade('1,0', 450)!
    expect(target.neededBlockII).toBe(373)
    expect(target.reachable).toBe(false)
  })

  it('Block II muss immer mindestens 100 sein', () => {
    expect(examTargetForGrade('4,0', 450)!.neededBlockII).toBe(100)
  })

  it('Zielnote bei bekanntem Block II → nötiger Block I', () => {
    expect(blockITargetForGrade('1,0', 250)).toEqual({ neededBlockI: 573, reachable: true })
    expect(blockITargetForGrade('1,0', 150)).toEqual({ neededBlockI: 673, reachable: false })
  })

  it('Vorschlag bei gleich starken Prüfungen: Gesamt = 1,5 × Block I', () => {
    expect(balancedBlockITarget('1,0')).toBe(549) // 823 · 2/3 = 548,67
    expect(balancedBlockITarget('4,0')).toBe(200)
  })
})

describe('Nötiger Schnitt in den restlichen Kursen', () => {
  const q1Final = (value: number) =>
    templateWith(
      Object.fromEntries(TEMPLATE_IDS.map((id) => [id, [value, value, null, null] as Quad<number | null>])),
      (s) => {
        s.settings.semesterFinal = [true, true, false, false]
      },
    )

  it('Q1 überall 10 Punkte, Ziel Block I 400 → Schnitt 10,0 in den 22 Q2-Kursen', () => {
    const result = requiredAverageForBlockI(q1Final(10), 400)
    expect(result.status).toBe('reachable')
    expect(result.remainingCount).toBe(22)
    expect(result.requiredAverage).toBe(10)
    expect(result.blockIAtRequired).toBeGreaterThanOrEqual(400)
  })

  it('der ermittelte Schnitt reicht, 0,1 Punkte weniger nicht', () => {
    const state = q1Final(9)
    const result = requiredAverageForBlockI(state, 420)
    expect(result.status).toBe('reachable')
    const required = result.requiredAverage!
    expect(required).toBeGreaterThan(9)
    expect(blockIWithRemainingAverage(state, required)).toBeGreaterThanOrEqual(420)
    expect(blockIWithRemainingAverage(state, Math.round(required * 10 - 1) / 10)).toBeLessThan(420)
  })

  it('unerreichbares Ziel wird erkannt', () => {
    const result = requiredAverageForBlockI(q1Final(5), 600)
    expect(result.status).toBe('unreachable')
    expect(result.maxBlockI).toBeLessThan(600)
  })

  it('ohne offene Halbjahre gibt es keine restlichen Kurse', () => {
    const state = templateWith(allSubjects(10), (s) => {
      s.settings.semesterFinal = [true, true, true, true]
    })
    expect(requiredAverageForBlockI(state, 400).status).toBe('no-remaining')
  })
})
