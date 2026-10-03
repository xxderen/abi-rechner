import { describe, expect, it } from 'vitest'
import { computeAll } from './compute'
import { allSubjects, templateWith } from './test-helpers'
import { createTemplateState } from './template'
import type { AppState } from './types'

const withExams = (state: AppState, written: [number, number, number], fourth: number) => {
  state.exams = { written, oral: [null, null, null], fourth }
  return state
}

describe('Gesamtergebnis', () => {
  it('ohne Noten und Prüfungen: offen', () => {
    const { overall } = computeAll(createTemplateState())
    expect(overall.status).toBe('open')
    expect(overall.grade).toBeNull()
    expect(overall.reasons).toHaveLength(2)
  })

  it('Block I 400 + Block II 215 = 615 → 2,2 (mit Hinweis auf die Wochenstunden)', () => {
    const { overall } = computeAll(withExams(templateWith(allSubjects(10)), [12, 11, 10], 10))
    expect(overall).toMatchObject({ status: 'passed', blockI: 400, blockII: 215, total: 615, grade: '2,2' })
    expect(overall.reasons.join(' ')).toContain('Wochenstundenzahl')
  })

  it('mit bestätigten Wochenstunden ohne Vorbehalt', () => {
    const state = withExams(templateWith(allSubjects(10)), [12, 11, 10], 10)
    state.settings.weeklyHoursOk = true
    expect(computeAll(state).overall.reasons).toEqual([])
  })

  it('Block II nicht bestanden → nicht bestanden, keine Note', () => {
    const { overall } = computeAll(withExams(templateWith(allSubjects(10)), [1, 1, 1], 1))
    expect(overall.status).toBe('failed')
    expect(overall.grade).toBeNull()
  })

  it('nicht zugelassen → nicht bestanden', () => {
    const { overall } = computeAll(withExams(templateWith(allSubjects(4)), [12, 12, 12], 12))
    expect(overall.status).toBe('failed')
    expect(overall.reasons[0]).toContain('Zulassungsvoraussetzungen')
  })
})
