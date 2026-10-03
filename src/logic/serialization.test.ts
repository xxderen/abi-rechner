import { describe, expect, it } from 'vitest'
import { createExport, exportFileName, parseImport, parseStoredState, validateState } from './serialization'
import { allSubjects, templateWith } from './test-helpers'
import { createTemplateState } from './template'

describe('Export / Import', () => {
  it('Export → Import ergibt denselben Zustand', () => {
    const state = templateWith(allSubjects(11), (s) => {
      s.settings.semesterFinal = [true, false, false, false]
      s.exams.written = [12, 10, null]
      s.goals.blockITarget = 450
    })
    const text = JSON.stringify(createExport(state))
    const result = parseImport(text)
    expect(result).toEqual({ ok: true, state })
  })

  it('akzeptiert auch einen reinen Zustand ohne Export-Hülle', () => {
    const state = createTemplateState()
    expect(parseImport(JSON.stringify(state))).toEqual({ ok: true, state })
  })

  it('lehnt kaputte oder fremde Dateien mit verständlicher Meldung ab', () => {
    expect(parseImport('{nicht json')).toEqual({ ok: false, error: 'Die Datei ist kein gültiges JSON.' })
    expect(parseImport(JSON.stringify({ app: 'etwas-anderes', state: {} })).ok).toBe(false)
    expect(parseImport(JSON.stringify({ version: 2 })).ok).toBe(false)
  })

  it('lehnt ungültige Punktzahlen ab', () => {
    const state = createTemplateState() as unknown as { subjects: Array<{ points: unknown[] }> }
    state.subjects[0].points = [16, null, null, null]
    const result = validateState(state)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Punktzahl')
  })

  it('lehnt doppelte Fach-IDs ab', () => {
    const state = createTemplateState()
    state.subjects[1].id = state.subjects[0].id
    expect(validateState(state).ok).toBe(false)
  })

  it('setzt ungültige Ziele auf Standardwerte zurück', () => {
    const state = { ...createTemplateState(), goals: { targetGrade: '7,0', blockITarget: 999 } }
    const result = validateState(state)
    expect(result.ok && result.state.goals).toEqual({ targetGrade: '1,0', blockITarget: null })
  })

  it('localStorage: nichts oder Unsinn gespeichert → null', () => {
    expect(parseStoredState(null)).toBeNull()
    expect(parseStoredState('kaputt')).toBeNull()
    expect(parseStoredState(JSON.stringify(createTemplateState()))).toEqual(createTemplateState())
  })

  it('Dateiname mit Datum', () => {
    expect(exportFileName(new Date(2027, 2, 5))).toBe('abi-rechner-2027-03-05.json')
  })
})
