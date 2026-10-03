import { describe, expect, it } from 'vitest'
import { blockIIStatus, evaluateBlockII, examPoints, oralExamResult, oralTable } from './blockII'

describe('Mündliche Nachprüfung', () => {
  it('S = 6, M = 8 → 33 Punkte (33,33, gerundet erst zum Schluss)', () => {
    expect(oralExamResult(6, 8)).toBe(33)
  })

  it('rundet kaufmännisch erst nach der 5-fachen Wertung', () => {
    expect(oralExamResult(7, 9)).toBe(38) // 38,33
    expect(oralExamResult(7, 8)).toBe(37) // 36,67
    expect(oralExamResult(6, 9)).toBe(35) // 35,0
    expect(oralExamResult(15, 15)).toBe(75)
  })
})

describe('Bestehensregel Block II', () => {
  it('25/35/25/10 → Summe 95 → nicht bestanden (100-Punkte-Bedingung verletzt)', () => {
    const result = evaluateBlockII([25, 35, 25, 10])
    expect(result.sum).toBe(95)
    expect(result.passed).toBe(false)
    expect(result.conditions).toEqual({ twoSubjects25: true, lk25: true, sum100: false })
    expect(result.messages).toHaveLength(1)
  })

  it('braucht mindestens einen LK (1. oder 2. Fach) mit 25 Punkten', () => {
    const result = evaluateBlockII([20, 20, 60, 60])
    expect(result.passed).toBe(false)
    expect(result.conditions.lk25).toBe(false)
  })

  it('braucht mindestens 2 Fächer mit 25 Punkten', () => {
    expect(evaluateBlockII([60, 20, 20, 20]).conditions.twoSubjects25).toBe(false)
    expect(evaluateBlockII([25, 20, 20, 50]).passed).toBe(true)
  })

  it('ist mit genau 100 Punkten und zwei Fächern ≥ 25 bestanden', () => {
    expect(evaluateBlockII([25, 25, 25, 25]).passed).toBe(true)
  })
})

describe('Status inkl. Nachprüfung', () => {
  it('ist unvollständig, solange ein Ergebnis fehlt', () => {
    const status = blockIIStatus({ written: [10, 10, null], oral: [null, null, null], fourth: 10 })
    expect(status.complete).toBe(false)
    expect(status.results).toEqual([50, 50, null, 50])
  })

  it('erkennt eine Pflicht-Nachprüfung und die nötigen mündlichen Punkte', () => {
    // schriftlich 4/4/12, mündlich 4. Fach 8 → kein LK mit 25 Punkten
    const status = blockIIStatus({ written: [4, 4, 12], oral: [null, null, null], fourth: 8 })
    expect(status.writtenOnly?.passed).toBe(false)
    expect(status.oralNeed).toBe('mandatory')
    // (2·4 + 7) / 3 · 5 = 25 → reicht; mit 6 mündlich nur 23,33
    expect(status.minOralToPass).toEqual([7, 7, null])
  })

  it('erkennt, wenn auch die Nachprüfung nicht mehr hilft', () => {
    const status = blockIIStatus({ written: [0, 0, 0], oral: [null, null, null], fourth: 0 })
    expect(status.oralNeed).toBe('impossible')
  })

  it('freiwillige Nachprüfung kann das Ergebnis verschlechtern', () => {
    const status = blockIIStatus({ written: [12, 10, 9], oral: [6, null, null], fourth: 10 })
    expect(status.oralNeed).toBe('voluntary')
    expect(status.results[0]).toBe(50) // (24 + 6) / 3 · 5 = 50 statt 60
    expect(status.evaluation?.sum).toBe(50 + 50 + 45 + 50)
  })
})

describe('Tabelle „Mündlich – Was bringt’s?“', () => {
  it('zeigt alle mündlichen Ergebnisse 0–15 mit neuem Ergebnis und Differenz', () => {
    const rows = oralTable(12)
    expect(rows).toHaveLength(16)
    expect(rows[12]).toEqual({ oral: 12, result: 60, diff: 0 })
    expect(rows[15]).toEqual({ oral: 15, result: 65, diff: 5 })
    expect(rows[0]).toEqual({ oral: 0, result: 40, diff: -20 })
    expect(rows.every((r) => r.result === oralExamResult(12, r.oral))).toBe(true)
    expect(examPoints(12)).toBe(60)
  })
})
