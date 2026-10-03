import { describe, expect, it } from 'vitest'
import { createSubject } from './catalog'
import { courseId } from './courses'
import { buildVariants } from './requirements'
import { allSubjects, templateWith } from './test-helpers'
import { createTemplateState } from './template'
import type { AppState, Subject } from './types'

const fixedIds = (state: AppState) => buildVariants(state).map((v) => [...v.fixed.keys()].sort())

function addSubject(state: AppState, subject: Partial<Subject> & Pick<Subject, 'id' | 'name' | 'short' | 'type'>) {
  state.subjects.push({ ...createSubject(subject), ...subject })
}

describe('Pflicht-Varianten', () => {
  it('Vorlage: Abifächer, Deutsch, Mathematik und Englisch sind in jeder Variante fest', () => {
    const variants = buildVariants(createTemplateState())
    expect(variants).toHaveLength(12)
    for (const v of variants) {
      for (const id of ['m', 'ch', 'd', 'sw', 'e']) {
        for (const sem of [0, 1, 2, 3] as const) expect(v.fixed.has(courseId(id, sem))).toBe(true)
      }
      expect(v.problems).toEqual([])
      expect(v.groups.map((g) => g.id)).toContain('kunst')
      expect(v.groups.map((g) => g.id)).toContain('religion')
    }
  })

  it('Vorlage: GE oder SW als durchgängige GW – die jeweils andere braucht 2 Kurse', () => {
    const variants = buildVariants(createTemplateState())
    const gwSW = variants.filter((v) => v.choices.some((c) => c.value === 'Sozialwissenschaften'))
    const gwGE = variants.filter((v) => v.choices.some((c) => c.value === 'Geschichte'))
    expect(gwSW).toHaveLength(6)
    expect(gwGE).toHaveLength(6)
    expect(gwSW.every((v) => v.groups.some((g) => g.id === 'ge') && !v.groups.some((g) => g.id === 'sw'))).toBe(true)
    expect(gwGE.every((v) => v.groups.some((g) => g.id === 'sw') && !v.groups.some((g) => g.id === 'ge'))).toBe(true)
  })

  it('naturwiss. Schwerpunkt: IF zählt als Naturwissenschaft, Schwerpunktfach ≠ gewählte NW', () => {
    const variants = buildVariants(createTemplateState())
    const pairs = variants.map((v) => {
      const nw = v.choices.find((c) => c.label === 'Durchgängige Naturwissenschaft')?.value
      const sp = v.choices.find((c) => c.label.startsWith('Schwerpunktfach'))?.value
      return `${nw}/${sp}`
    })
    expect(new Set(pairs)).toEqual(
      new Set(['Chemie/Physik', 'Chemie/Informatik', 'Physik/Chemie', 'Physik/Informatik', 'Informatik/Chemie', 'Informatik/Physik']),
    )
  })

  it('sprachlicher Schwerpunkt: IF zählt nicht als Naturwissenschaft', () => {
    const state = createTemplateState()
    state.settings.schwerpunkt = 'sprachlich'
    const variants = buildVariants(state)
    expect(variants.some((v) => v.choices.some((c) => c.label === 'Durchgängige Naturwissenschaft' && c.value === 'Informatik'))).toBe(false)
    // nur eine Fremdsprache → Schwerpunkt nicht erfüllbar
    expect(variants.every((v) => v.problems.some((p) => p.includes('Schwerpunkt (sprachlich)')))).toBe(true)
  })

  it('sprachlicher Schwerpunkt mit zwei Fremdsprachen: Q2 der jeweils anderen ist Pflicht', () => {
    const state = createTemplateState()
    state.settings.schwerpunkt = 'sprachlich'
    addSubject(state, { id: 'f', name: 'Französisch', short: 'F', type: 'FS' })
    const variants = buildVariants(state)
    const withFasFS = variants.filter((v) => v.choices.some((c) => c.label === 'Fremdsprache (4 Kurse)' && c.value === 'Französisch'))
    expect(withFasFS.length).toBeGreaterThan(0)
    for (const v of withFasFS) {
      expect(v.fixed.has(courseId('f', 0))).toBe(true)
      expect(v.fixed.has(courseId('e', 2))).toBe(true)
      expect(v.fixed.has(courseId('e', 3))).toBe(true)
    }
  })

  it('neu einsetzende Fremdsprache, fortgeführte bis Q2: 4 Kurse fortgeführte + Q2 der neuen', () => {
    const state = createTemplateState()
    addSubject(state, { id: 's', name: 'Spanisch', short: 'S', type: 'FS', newLanguage: true })
    for (const fixed of fixedIds(state)) {
      expect(fixed).toEqual(expect.arrayContaining([courseId('e', 0), courseId('e', 3), courseId('s', 2), courseId('s', 3)]))
      expect(fixed).not.toContain(courseId('s', 0))
      expect(fixed).not.toContain(courseId('s', 1))
    }
  })

  it('neu einsetzende Fremdsprache, fortgeführte nach der EF abgewählt: 4 Kurse der neuen', () => {
    const state = createTemplateState()
    state.subjects = state.subjects.filter((s) => s.id !== 'e')
    addSubject(state, { id: 's', name: 'Spanisch', short: 'S', type: 'FS', newLanguage: true })
    for (const fixed of fixedIds(state)) {
      expect(fixed).toEqual(expect.arrayContaining([0, 1, 2, 3].map((sem) => courseId('s', sem as 0 | 1 | 2 | 3))))
    }
  })

  it('Philosophie als Ersatzfach: die Religionsgruppe besteht aus Philosophie-Kursen', () => {
    const state = createTemplateState()
    state.subjects = state.subjects.filter((s) => s.id !== 'kr')
    addSubject(state, { id: 'pl', name: 'Philosophie', short: 'PL', type: 'PL', taken: [true, true, false, false] })
    state.settings.philosophyReplacesReligion = true
    const religion = buildVariants(state)[0].groups.find((g) => g.id === 'religion')!
    expect(religion.label).toContain('Philosophie')
    expect(religion.courseIds).toEqual([courseId('pl', 0), courseId('pl', 1)])
  })

  it('meldet fehlende Pflichtfächer im Klartext', () => {
    const state = templateWith(allSubjects(10), (s) => {
      s.subjects = s.subjects.filter((x) => !['ch', 'ph', 'if'].includes(x.id))
    })
    const problems = buildVariants(state).flatMap((v) => v.problems)
    expect(problems.some((p) => p.startsWith('Naturwissenschaft:'))).toBe(true)
    expect(problems.some((p) => p.startsWith('Schwerpunkt'))).toBe(true)
  })

  it('Abifach, das nicht in allen 4 Halbjahren belegt ist, wird gemeldet', () => {
    const state = createTemplateState()
    state.subjects.find((s) => s.id === 'sw')!.taken = [true, true, true, false]
    expect(buildVariants(state).every((v) => v.problems.some((p) => p.includes('Sozialwissenschaften ist 4. Abifach')))).toBe(true)
  })
})
