import { describe, expect, it } from 'vitest'
import { countEmptyForecastCells, fillEmptyForecasts, subjectAverage } from './forecast'
import { createTemplateState } from './template'
import { validateConfig } from './validation'

describe('Konfigurations-Hinweise', () => {
  it('die Vorlage ist stimmig', () => {
    expect(validateConfig(createTemplateState())).toEqual([])
  })

  it('doppelt vergebenes Abifach, falsche Kursart und unvollständige Belegung', () => {
    const state = createTemplateState()
    state.subjects.find((s) => s.id === 'e')!.abiFach = 3 // Deutsch ist schon 3.
    state.subjects.find((s) => s.id === 'sw')!.level = 'LK'
    state.subjects.find((s) => s.id === 'd')!.taken = [true, true, true, false]
    const messages = validateConfig(state).map((i) => i.message)
    expect(messages.some((m) => m.includes('3. Abifach ist mehrfach vergeben'))).toBe(true)
    expect(messages.some((m) => m.includes('Sozialwissenschaften ist 4. Abifach und muss Grundkurs sein'))).toBe(true)
    expect(messages.some((m) => m.includes('3 Leistungskurse'))).toBe(true)
    expect(messages.some((m) => m.includes('Deutsch ist 3. Abifach und muss in allen 4 Halbjahren belegt sein'))).toBe(true)
  })

  it('meldet fehlende Noten in Halbjahren mit Zeugnis', () => {
    const state = createTemplateState()
    state.settings.semesterFinal = [true, false, false, false]
    const messages = validateConfig(state).map((i) => i.message)
    expect(messages).toEqual(['Q1.1: Das Zeugnis liegt vor, aber 11 Noten fehlen (M, CH, D, SW, E, MU, GE, PH, IF, KR, SP).'])
  })
})

describe('Leere Prognosefelder füllen', () => {
  it('füllt nur Halbjahre ohne Zeugnis', () => {
    const state = createTemplateState()
    state.settings.semesterFinal = [true, true, false, false]
    expect(countEmptyForecastCells(state)).toBe(22)
    const { state: filled, filled: count } = fillEmptyForecasts(state, { kind: 'fixed', value: 9 })
    expect(count).toBe(22)
    expect(filled.subjects[0].points).toEqual([null, null, 9, 9])
    expect(countEmptyForecastCells(filled)).toBe(0)
  })

  it('mit dem Schnitt des Fachs (gerundet), sonst Ersatzwert', () => {
    const state = createTemplateState()
    state.settings.semesterFinal = [true, true, false, false]
    state.subjects[0].points = [12, 13, null, null] // Schnitt 12,5 → 13
    expect(subjectAverage(state.subjects[0])).toBe(13)
    const { state: filled } = fillEmptyForecasts(state, { kind: 'subject-average', fallback: 8 })
    expect(filled.subjects[0].points).toEqual([12, 13, 13, 13])
    expect(filled.subjects[1].points).toEqual([null, null, 8, 8])
  })
})
