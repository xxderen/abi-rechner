import { describe, expect, it } from 'vitest'
import { courseId } from './courses'
import { optimize } from './optimizer'
import { allSubjects, templateWith, uniform } from './test-helpers'
import { createTemplateState } from './template'

const pflichtIds = (roles: Map<string, string>) =>
  [...roles].filter(([, role]) => role === 'pflicht').map(([id]) => id).sort()

describe('Optimierer mit der Vorlage (M-LK, CH-LK, D, SW)', () => {
  it('ohne Noten: Block I ist noch offen', () => {
    const result = optimize(createTemplateState())
    expect(result.status).toBe('incomplete')
    expect(result.missing).toHaveLength(44)
    expect(result.best).toBeNull()
  })

  it('probiert 12 Pflicht-Varianten durch (GW: SW/GE × NW: CH/PH/IF × Schwerpunkt)', () => {
    const result = optimize(templateWith(allSubjects(10)))
    expect(result.variantCount).toBe(12)
  })

  it('überall 10 Punkte → Block I 400 mit genau 35 Kursen und 28 Pflichtkursen', () => {
    const result = optimize(templateWith(allSubjects(10)))
    const best = result.best!
    expect(best.feasible).toBe(true)
    expect(best.blockI).toBe(400)
    expect(best.count).toBe(35)
    expect(best.S).toBe(43)
    expect(best.P).toBe(430)
    expect(best.pflichtCount).toBe(28)

    const all4 = (id: string) => [0, 1, 2, 3].map((sem) => courseId(id, sem as 0 | 1 | 2 | 3))
    const expected = [
      ...all4('m'),
      ...all4('ch'),
      ...all4('d'),
      ...all4('sw'),
      ...all4('e'),
      courseId('mu', 0),
      courseId('mu', 1),
      courseId('ge', 0),
      courseId('ge', 1),
      courseId('kr', 0),
      courseId('kr', 1),
      courseId('ph', 2),
      courseId('ph', 3),
    ].sort()
    expect(pflichtIds(best.roles)).toEqual(expected)
    expect([...best.roles.values()].filter((r) => r === 'zusatz')).toHaveLength(7)
    expect(best.variant.choices).toEqual([
      { label: 'Fremdsprache (4 Kurse)', value: 'Englisch' },
      { label: 'Durchgängige Gesellschaftswissenschaft', value: 'Sozialwissenschaften' },
      { label: 'Durchgängige Naturwissenschaft', value: 'Chemie' },
      { label: 'Schwerpunktfach (2 Kurse der Q2)', value: 'Physik' },
    ])
  })

  it('gezieltes Notenmuster: von Hand nachgerechnet → Block I 463', () => {
    const state = templateWith({
      m: [12, 13, 11, 14],
      ch: [10, 9, 11, 12],
      d: [9, 8, 10, 9],
      sw: [11, 11, 12, 12],
      e: [7, 8, 8, 9],
      mu: [14, 3, 13, 2],
      ge: [4, 4, 11, 11],
      ph: [6, 6, 5, 5],
      if: [13, 13, 14, 15],
      kr: [5, 15, 15, 5],
      sp: uniform(15),
    })
    const best = optimize(state).best!
    // Pflicht: LK (50 + 42) × 2 = 184; D 36, SW 46, E 32, MU 14+13, GE 11+11, KR 15+15, IF-Q2 14+15 → 406
    // zusätzlich: SP 4 × 15, IF 13 + 13, PH 6 → 92;  P = 498, S = 8 × 2 + 27 = 43
    expect(best.P).toBe(498)
    expect(best.S).toBe(43)
    expect(best.count).toBe(35)
    expect(best.blockI).toBe(463) // 498 / 43 × 40 = 463,26
    expect(best.deficits).toBe(0)
    // Schwerpunkt Informatik statt Physik (PH-Q2 hätte nur 5 Punkte)
    expect(best.variant.choices.find((c) => c.label.startsWith('Schwerpunkt'))?.value).toBe('Informatik')
    // die 2 besten Musik-Kurse sind Pflicht, die schwachen bleiben draußen
    expect(best.roles.get(courseId('mu', 0))).toBe('pflicht')
    expect(best.roles.get(courseId('mu', 2))).toBe('pflicht')
    expect(best.roles.has(courseId('mu', 1))).toBe(false)
    expect(best.roles.has(courseId('mu', 3))).toBe(false)
    // GE als 2-Kurse-Pflicht: die beiden 11er aus der Q2
    expect(best.roles.get(courseId('ge', 2))).toBe('pflicht')
    expect(best.roles.get(courseId('ge', 3))).toBe('pflicht')
    // Sport wie jeder andere GK: alle 4 Kurse eingebracht (keine Obergrenze)
    expect([0, 1, 2, 3].every((sem) => best.roles.get(courseId('sp', sem as 0 | 1 | 2 | 3)) === 'zusatz')).toBe(true)
  })

  it('bringt einen Kurs genau auf oder unter dem Schnitt nicht zusätzlich ein', () => {
    const result = optimize(templateWith(allSubjects(10)))
    // mehr Kurse mit gleichem Schnitt → Gleichstand → weniger Kurse gewinnen
    expect(result.perCount.map((p) => p.selection.blockI)).toEqual([400, 400, 400, 400, 400, 400])
    expect(result.best!.count).toBe(35)
  })

  it('nimmt mehr Kurse, wenn sie über dem Schnitt liegen', () => {
    // Pflichtkurse schwach (8), alle freien Kurse 15 → jeder zusätzliche Kurs hebt den Schnitt
    const state = templateWith({
      ...allSubjects(15),
      m: uniform(8),
      ch: uniform(8),
      d: uniform(8),
      sw: uniform(8),
      e: uniform(8),
    })
    const best = optimize(state).best!
    expect(best.count).toBe(40)
    expect(best.P).toBe(524)
    expect(best.blockI).toBe(437) // 524 / 48 × 40 = 436,67
  })

  it('nimmt keinen zusätzlichen Kurs, der den Schnitt senken würde', () => {
    // Pflicht im Schnitt 9,56; freie Kurse nur 8 → so wenige wie möglich (35)
    const state = templateWith({ ...allSubjects(8), sp: uniform(15), if: uniform(15) })
    const best = optimize(state).best!
    expect(best.count).toBe(35)
    expect(best.P).toBe(400)
    expect(best.blockI).toBe(372) // 400 / 43 × 40 = 372,09
  })

  it('zu viele Pflicht-Defizite erzwingen 38–40 Kurse', () => {
    // 8 Defizite in Pflichtkursen (2 im LK): mit 35–37 Kursen nicht zulässig
    const state = templateWith({
      ...allSubjects(10),
      m: [3, 3, 12, 12],
      d: [4, 4, 4, 10],
      e: [4, 4, 4, 10],
    })
    const result = optimize(state)
    const byCount = new Map(result.perCount.map((p) => [p.count, p.selection]))
    for (const n of [35, 36, 37]) {
      expect(byCount.get(n)!.feasible).toBe(false)
      expect(byCount.get(n)!.violations.map((v) => v.code)).toContain('deficits')
    }
    expect(byCount.get(38)!.feasible).toBe(true)
    const best = result.best!
    expect(best.count).toBe(40)
    expect(best.deficits).toBe(8)
    expect(best.lkDeficits).toBe(2)
    expect(best.blockI).toBe(353) // P = 424, S = 48
  })

  it('4 LK-Defizite: keine zulässige Auswahl', () => {
    const state = templateWith({ ...allSubjects(10), m: [3, 3, 3, 3], d: [4, 4, 4, 4] })
    const result = optimize(state)
    expect(result.best).toBeNull()
    const at38 = result.perCount.find((p) => p.count === 38)!.selection
    expect(at38.deficits).toBe(8)
    expect(at38.lkDeficits).toBe(4)
    expect(at38.violations.map((v) => v.code)).toEqual(['lk-deficits'])
  })

  it('umgeht einen Pflicht-Kurs mit 0 Punkten, wenn eine andere Wahl möglich ist', () => {
    const state = templateWith({ ...allSubjects(10), mu: [0, 10, 12, 11] })
    const best = optimize(state).best!
    expect(best.feasible).toBe(true)
    expect(best.roles.get(courseId('mu', 2))).toBe('pflicht')
    expect(best.roles.get(courseId('mu', 3))).toBe('pflicht')
    expect(best.roles.has(courseId('mu', 0))).toBe(false)
  })

  it('bringt freie Kurse mit 0 Punkten nie ein', () => {
    const state = templateWith({ ...allSubjects(10), sp: [0, 0, 15, 15], mu: [0, 10, 12, 11] })
    const result = optimize(state)
    for (const { selection } of result.perCount) {
      for (const id of selection.roles.keys()) {
        expect(id === courseId('sp', 0) || id === courseId('sp', 1) || id === courseId('mu', 0)).toBe(false)
      }
    }
  })

  it('Pflichtkurs Deutsch mit 0 Punkten → keine zulässige Auswahl', () => {
    const state = templateWith({ ...allSubjects(10), d: [0, 10, 10, 10] })
    const result = optimize(state)
    expect(result.best).toBeNull()
    expect(result.display!.violations.some((v) => v.code === 'zero' && v.message.includes('Deutsch Q1.1'))).toBe(true)
  })

  it('weniger als 35 einbringbare Kurse (wegen 0 Punkten) → nicht zulässig', () => {
    const state = templateWith({ ...allSubjects(10), sp: uniform(0), if: uniform(0), ph: [0, 0, 10, 10] })
    const result = optimize(state)
    expect(result.best).toBeNull()
    expect(result.display!.violations.map((v) => v.code)).toContain('not-enough')
  })

  it('Vertiefungskurse werden nie eingebracht und nicht gezählt', () => {
    const state = templateWith(allSubjects(10), (s) => {
      s.subjects.push({
        id: 'vm',
        name: 'Vertiefungskurs Mathematik',
        short: 'VM',
        type: 'VTF',
        level: 'GK',
        abiFach: null,
        taken: [true, true, false, false],
        points: [15, 15, null, null],
      })
    })
    const result = optimize(state)
    for (const { selection } of result.perCount) {
      expect(selection.roles.has(courseId('vm', 0))).toBe(false)
    }
    expect(result.best!.blockI).toBe(400)
  })

  it('Projektkurs „automatisch“: nur als Paar und nur, wenn er den Schnitt hebt', () => {
    const withPk = (points: [number, number]) =>
      templateWith(allSubjects(10), (s) => {
        s.subjects.push({
          id: 'pk',
          name: 'Projektkurs',
          short: 'PK',
          type: 'PK',
          level: 'GK',
          abiFach: null,
          taken: [false, true, true, false],
          points: [null, points[0], points[1], null],
          projectMode: 'auto',
        })
      })
    const good = optimize(withPk([15, 13])).best!
    expect(good.roles.get(courseId('pk', 1))).toBe('pflicht')
    expect(good.roles.get(courseId('pk', 2))).toBe('pflicht')
    const bad = optimize(withPk([15, 2])).best!
    // 15 + 2 = 17 < 2 × 10: als Paar schlechter als zwei 10er → nicht eingebracht
    expect(bad.roles.has(courseId('pk', 1))).toBe(false)
    expect(bad.roles.has(courseId('pk', 2))).toBe(false)
  })

  it('Projektkurs als besondere Lernleistung fällt aus Block I', () => {
    const state = templateWith(allSubjects(10), (s) => {
      s.subjects.push({
        id: 'pk',
        name: 'Projektkurs',
        short: 'PK',
        type: 'PK',
        level: 'GK',
        abiFach: null,
        taken: [false, true, true, false],
        points: [null, 15, 15, null],
        projectMode: 'bll',
      })
    })
    const best = optimize(state).best!
    expect(best.roles.has(courseId('pk', 1))).toBe(false)
    expect(best.blockI).toBe(400)
  })
})
