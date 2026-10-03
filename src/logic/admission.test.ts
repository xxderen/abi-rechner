import { describe, expect, it } from 'vitest'
import { evaluateAdmission } from './admission'
import { deriveCourses } from './courses'
import { optimize } from './optimizer'
import { allSubjects, templateWith } from './test-helpers'
import { createTemplateState } from './template'
import type { AppState } from './types'

function admission(state: AppState) {
  return evaluateAdmission(state.settings, deriveCourses(state), optimize(state))
}

describe('Zulassungsvoraussetzungen', () => {
  it('Vorlage ohne Noten: 44 Kurse belegt, Rest noch offen', () => {
    const result = admission(createTemplateState())
    expect(result.taken).toEqual({ total: 44, gk: 36, lk: 8 })
    expect(result.criteria.map((c) => c.status)).toEqual(['ok', 'unknown', 'open', 'open', 'open'])
    expect(result.status).toBe('open')
  })

  it('alles erfüllt, Wochenstunden nicht bestätigt → „zugelassen, sofern Ø 34 Wochenstunden“', () => {
    const result = admission(templateWith(allSubjects(10)))
    expect(result.criteria.map((c) => c.status)).toEqual(['ok', 'unknown', 'ok', 'ok', 'ok'])
    expect(result.status).toBe('admitted-pending-hours')
  })

  it('mit bestätigten Wochenstunden → zugelassen', () => {
    const state = templateWith(allSubjects(10), (s) => {
      s.settings.weeklyHoursOk = true
    })
    expect(admission(state).status).toBe('admitted')
  })

  it('weniger als 38 belegte Kurse → nicht zugelassen', () => {
    const state = templateWith(allSubjects(10), (s) => {
      for (const id of ['mu', 'ge', 'if']) {
        s.subjects.find((x) => x.id === id)!.taken = [true, true, false, false]
      }
      s.subjects.find((x) => x.id === 'kr')!.taken = [true, true, true, false]
    })
    const result = admission(state)
    expect(result.taken.total).toBe(37)
    expect(result.criteria[0].status).toBe('fail')
    expect(result.status).toBe('not-admitted')
  })

  it('Defizitgrenzen: 36 Kurse mit 8 Defiziten → nicht zugelassen (erst ab 38 Kursen zulässig)', () => {
    const state = templateWith({ ...allSubjects(10), m: [3, 3, 12, 12], d: [4, 4, 4, 10], e: [4, 4, 4, 10] })
    const result = optimize(state)
    const at36 = result.perCount.find((p) => p.count === 36)!.selection
    expect(at36.deficits).toBe(8)
    expect(at36.feasible).toBe(false)
    // Der Optimierer weicht auf 38–40 Kurse aus, dort sind 8 Defizite erlaubt.
    expect(admission(state).criteria[3].status).toBe('ok')
    expect(result.best!.count).toBeGreaterThanOrEqual(38)
  })

  it('Defizitgrenzen: 38 Kurse mit 8 Defiziten, davon 4 im LK → nicht zugelassen', () => {
    const state = templateWith({ ...allSubjects(10), m: [3, 3, 3, 3], d: [4, 4, 4, 4] })
    const result = admission(state)
    expect(result.status).toBe('not-admitted')
    expect(result.criteria[3].status).toBe('fail')
    expect(result.criteria[3].messages.join(' ')).toContain('Leistungskursen')
  })

  it('Block I unter 200 → nicht zugelassen', () => {
    const state = templateWith(allSubjects(4))
    const result = admission(state)
    expect(result.criteria[4].status).toBe('fail')
    expect(result.status).toBe('not-admitted')
  })

  it('fehlende Pflicht (keine Religion) → Kriterium 3 nicht erfüllt', () => {
    const state = templateWith(allSubjects(10), (s) => {
      s.subjects = s.subjects.filter((x) => x.id !== 'kr')
    })
    const result = admission(state)
    expect(result.criteria[2].status).toBe('fail')
    expect(result.criteria[2].messages.join(' ')).toContain('Religionslehre')
  })
})
