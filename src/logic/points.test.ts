import { describe, expect, it } from 'vitest'
import { formatPoints, isDeficit, parsePointsInput, pointsToGrade, roundHalfUpFraction } from './points'

describe('Punkte → Note', () => {
  it('ordnet alle Punktzahlen wie auf der Schulfolie zu', () => {
    const expected = ['6', '5-', '5', '5+', '4-', '4', '4+', '3-', '3', '3+', '2-', '2', '2+', '1-', '1', '1+']
    expected.forEach((grade, points) => expect(pointsToGrade(points)).toBe(grade))
    expect(pointsToGrade(15)).toBe('1+')
    expect(pointsToGrade(13)).toBe('1-')
    expect(pointsToGrade(3)).toBe('5+')
    expect(pointsToGrade(1)).toBe('5-')
    expect(pointsToGrade(0)).toBe('6')
  })

  it('lehnt ungültige Punktzahlen ab', () => {
    expect(() => pointsToGrade(16)).toThrow()
    expect(() => pointsToGrade(-1)).toThrow()
    expect(() => pointsToGrade(7.5)).toThrow()
  })

  it('zeigt Punkte zweistellig wie auf den Folien', () => {
    expect(formatPoints(8)).toBe('08')
    expect(formatPoints(0)).toBe('00')
    expect(formatPoints(15)).toBe('15')
  })
})

describe('Eingabe von Punkten', () => {
  it('leer = keine Note, 0–15 gültig, sonst ungültig', () => {
    expect(parsePointsInput('')).toBeNull()
    expect(parsePointsInput('  ')).toBeNull()
    expect(parsePointsInput('0')).toBe(0)
    expect(parsePointsInput('07')).toBe(7)
    expect(parsePointsInput('15')).toBe(15)
    expect(parsePointsInput('16')).toBeUndefined()
    expect(parsePointsInput('-1')).toBeUndefined()
    expect(parsePointsInput('1,5')).toBeUndefined()
    expect(parsePointsInput('abc')).toBeUndefined()
  })
})

describe('Defizit', () => {
  it('unter 5 Punkten – 4 Punkte sind bereits ein Defizit', () => {
    expect(isDeficit(4)).toBe(true)
    expect(isDeficit(5)).toBe(false)
    expect(isDeficit(1)).toBe(true)
  })
})

describe('Kaufmännisches Runden', () => {
  it('rundet exakt ,5 auf und rechnet ganzzahlig ohne Fließkomma-Fehler', () => {
    expect(roundHalfUpFraction(5, 2)).toBe(3) // 2,5 → 3
    expect(roundHalfUpFraction(7, 2)).toBe(4) // 3,5 → 4
    expect(roundHalfUpFraction(4, 3)).toBe(1) // 1,33 → 1
    expect(roundHalfUpFraction(5, 3)).toBe(2) // 1,67 → 2
    expect(roundHalfUpFraction(339 * 40, 48)).toBe(283) // 282,5 → 283
  })
})
