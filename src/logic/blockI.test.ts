import { describe, expect, it } from 'vitest'
import { blockIScore, checkDeficits, deficitLimit } from './blockI'

describe('Block I = round(P / S × 40) – Beispiele aus der Schulpräsentation', () => {
  it('P = 359, S = 43 → Block I = 334', () => {
    expect(blockIScore(359, 43)).toBe(334)
  })

  it('P = 377, S = 45 → Block I = 335', () => {
    expect(blockIScore(377, 45)).toBe(335)
  })

  it('P = 445, S = 43 → Block I = 414', () => {
    expect(blockIScore(445, 43)).toBe(414)
  })

  it('rundet kaufmännisch: exakt ,5 wird aufgerundet', () => {
    expect(blockIScore(339, 48)).toBe(283) // 282,5
    expect(blockIScore(338, 48)).toBe(282) // 281,67
  })

  it('liegt zwischen 200 (überall 5 Punkte) und 600 (überall 15 Punkte)', () => {
    expect(blockIScore(5 * 43, 43)).toBe(200)
    expect(blockIScore(15 * 48, 48)).toBe(600)
  })
})

describe('Defizitgrenzen', () => {
  it('35–37 Kurse: max. 7 Defizite, 38–40 Kurse: max. 8 Defizite', () => {
    expect([35, 36, 37].map(deficitLimit)).toEqual([7, 7, 7])
    expect([38, 39, 40].map(deficitLimit)).toEqual([8, 8, 8])
  })

  it('36 Kurse mit 8 Defiziten → nicht zugelassen', () => {
    const result = checkDeficits(36, 8, 0)
    expect(result.ok).toBe(false)
    expect(result.issues.map((i) => i.code)).toEqual(['deficits'])
  })

  it('38 Kurse mit 8 Defiziten, davon 4 im LK → nicht zugelassen', () => {
    const result = checkDeficits(38, 8, 4)
    expect(result.ok).toBe(false)
    expect(result.issues.map((i) => i.code)).toEqual(['lk-deficits'])
  })

  it('Grenzfälle, die erlaubt sind', () => {
    expect(checkDeficits(37, 7, 3).ok).toBe(true)
    expect(checkDeficits(38, 8, 3).ok).toBe(true)
    expect(checkDeficits(40, 8, 0).ok).toBe(true)
    expect(checkDeficits(40, 9, 0).ok).toBe(false)
  })
})
