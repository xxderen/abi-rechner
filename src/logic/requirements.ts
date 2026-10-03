/**
 * Pflicht-Wertungskurse (laut Schulpräsentation) → alle Varianten.
 *
 * Wo es echte Wahlmöglichkeiten gibt (welche Fremdsprache, welche durchgängige
 * Gesellschafts- bzw. Naturwissenschaft, welches Schwerpunktfach, Projektkurs
 * ja/nein), entsteht pro Möglichkeit eine eigene Variante.
 * „Irgendwelche 2 Kurse aus …“ (KU/MU/LI, Religion, GE, SW) sind Gruppen mit
 * Mindestanzahl; welche Kurse das sind, entscheidet der Optimierer.
 */
import { courseId, isLKSubject, projectModeOf } from './courses'
import type { AppState, Sem, Subject, SubjectType } from './types'
import { SEMESTERS } from './types'

export interface PflichtGroup {
  id: string
  label: string
  courseIds: string[]
  /** so viele Kurse aus der Gruppe müssen eingebracht werden */
  need: number
}

export interface VariantChoice {
  label: string
  value: string
}

export interface Variant {
  key: string
  /** Klartext der getroffenen Wahl, z. B. „Durchgängige Naturwissenschaft: Chemie“ */
  choices: VariantChoice[]
  /** feste Pflichtkurse → Gründe */
  fixed: Map<string, string[]>
  groups: PflichtGroup[]
  /** nicht erfüllbare Anforderungen (Klartext) */
  problems: string[]
}

interface PartialVariant {
  choices: VariantChoice[]
  fixed: Map<string, string[]>
  groups: PflichtGroup[]
  problems: string[]
  meta: { fs?: string; nw?: string }
}

interface Option {
  choices?: VariantChoice[]
  fixed?: Array<[string, string]>
  groups?: PflichtGroup[]
  problems?: string[]
  meta?: PartialVariant['meta']
}

const Q2: readonly Sem[] = [2, 3]

const takenAll = (s: Subject) => s.taken.every(Boolean)
const takenQ2 = (s: Subject) => s.taken[2] && s.taken[3]

function coursesOf(subject: Subject, sems: readonly Sem[] = SEMESTERS): string[] {
  return sems.filter((sem) => subject.taken[sem]).map((sem) => courseId(subject.id, sem))
}

function addReason(fixed: Map<string, string[]>, id: string, reason: string): void {
  const reasons = fixed.get(id)
  if (!reasons) fixed.set(id, [reason])
  else if (!reasons.includes(reason)) reasons.push(reason)
}

function extend(partials: PartialVariant[], options: (p: PartialVariant) => Option[]): PartialVariant[] {
  const result: PartialVariant[] = []
  for (const p of partials) {
    for (const option of options(p)) {
      const fixed = new Map<string, string[]>()
      for (const [id, reasons] of p.fixed) fixed.set(id, [...reasons])
      for (const [id, reason] of option.fixed ?? []) addReason(fixed, id, reason)
      result.push({
        choices: [...p.choices, ...(option.choices ?? [])],
        fixed,
        groups: [...p.groups, ...(option.groups ?? [])],
        problems: [...p.problems, ...(option.problems ?? [])],
        meta: { ...p.meta, ...option.meta },
      })
    }
  }
  return result
}

function fixedOf(subject: Subject, reason: string, sems: readonly Sem[] = SEMESTERS): Array<[string, string]> {
  return coursesOf(subject, sems).map((id) => [id, reason])
}

function variantKey(p: PartialVariant): string {
  const fixed = [...p.fixed.keys()].sort().join(',')
  const groups = p.groups
    .map((g) => `${g.id}:${g.need}:${[...g.courseIds].sort().join(',')}`)
    .sort()
    .join(';')
  const problems = [...new Set(p.problems)].sort().join(';')
  return `${fixed}|${groups}|${problems}`
}

export function buildVariants(state: AppState): Variant[] {
  const { subjects, settings } = state
  const ofType = (...types: SubjectType[]) => subjects.filter((s) => types.includes(s.type))
  const group = (id: string, label: string, members: Subject[]): PflichtGroup => ({
    id,
    label,
    courseIds: members.flatMap((s) => coursesOf(s)),
    need: 2,
  })

  // In jeder Variante fest: alle 4 Abiturfächer in allen 4 Halbjahren (damit auch beide LK)
  const base: PartialVariant = { choices: [], fixed: new Map(), groups: [], problems: [], meta: {} }
  for (const s of subjects) {
    if (s.type === 'PK' || s.type === 'VTF') continue
    if (s.abiFach !== null) {
      const reason = `${s.abiFach}. Abifach${isLKSubject(s) ? ' (LK)' : ''}`
      for (const id of coursesOf(s)) addReason(base.fixed, id, reason)
      if (!takenAll(s)) {
        base.problems.push(`${s.name} ist ${s.abiFach}. Abifach, aber nicht in allen 4 Halbjahren belegt.`)
      }
    } else if (isLKSubject(s)) {
      for (const id of coursesOf(s)) addReason(base.fixed, id, 'Leistungskurs')
    }
  }

  // 2 Kurse in Kunst, Musik oder Literatur
  base.groups.push(group('kunst', '2 Kurse aus Kunst, Musik oder Literatur', ofType('KU', 'MU', 'LI')))
  // 2 Kurse Religion (bzw. Philosophie als Ersatzfach)
  base.groups.push(
    settings.philosophyReplacesReligion
      ? group('religion', '2 Kurse Philosophie (Ersatzfach für Religion)', ofType('PL'))
      : group('religion', '2 Kurse Religionslehre', ofType('REL')),
  )

  let partials: PartialVariant[] = [base]

  // 4 Kurse Deutsch, 4 Kurse Mathematik
  const fourCourses = (type: SubjectType, name: string): Option[] => {
    const candidates = ofType(type)
    const full = candidates.filter(takenAll)
    if (full.length === 0) {
      return [
        {
          problems: [
            candidates.length > 0
              ? `${name}: 4 Kurse nötig, aber nicht in allen 4 Halbjahren belegt.`
              : `${name} fehlt (4 Kurse nötig).`,
          ],
        },
      ]
    }
    return full.map((s) => ({ fixed: fixedOf(s, `${name} (4 Kurse)`) }))
  }
  partials = extend(partials, () => fourCourses('D', 'Deutsch'))
  partials = extend(partials, () => fourCourses('M', 'Mathematik'))

  // 4 Kurse in einer Fremdsprache (+ Sonderregel neu einsetzende Fremdsprache)
  partials = extend(partials, () => {
    const all = ofType('FS')
    const newOnes = all.filter((s) => s.newLanguage)
    const continuedFull = all.filter((s) => !s.newLanguage && takenAll(s))

    if (newOnes.length === 0) {
      if (continuedFull.length === 0) {
        return [
          {
            problems: [
              all.length > 0
                ? 'Fremdsprache: 4 Kurse nötig, aber keine Fremdsprache ist in allen 4 Halbjahren belegt.'
                : 'Fremdsprache fehlt (4 Kurse nötig).',
            ],
          },
        ]
      }
      return continuedFull.map((s) => ({
        choices: [{ label: 'Fremdsprache (4 Kurse)', value: s.name }],
        fixed: fixedOf(s, 'Fremdsprache (4 Kurse)'),
        meta: { fs: s.id },
      }))
    }

    const options: Option[] = []
    for (const neu of newOnes) {
      if (continuedFull.length > 0) {
        // Fortgeführte Fremdsprache bis Ende Q2 belegt → 4 Kurse davon + 2 Kurse der Q2 der neuen
        for (const fs of continuedFull) {
          options.push({
            choices: [
              { label: 'Fremdsprache (4 Kurse)', value: fs.name },
              { label: 'Neu einsetzende Fremdsprache (Q2)', value: neu.name },
            ],
            fixed: [
              ...fixedOf(fs, 'Fremdsprache (4 Kurse)'),
              ...fixedOf(neu, 'Neu einsetzende Fremdsprache (2 Kurse der Q2)', Q2),
            ],
            problems: takenQ2(neu) ? [] : [`${neu.name} (neu einsetzend): Q2.1 und Q2.2 müssen belegt sein.`],
            meta: { fs: fs.id },
          })
        }
      } else {
        // Fortgeführte Fremdsprache nach der EF abgewählt → 4 Kurse der neu einsetzenden
        options.push({
          choices: [{ label: 'Fremdsprache (4 Kurse, neu einsetzend)', value: neu.name }],
          fixed: fixedOf(neu, 'Neu einsetzende Fremdsprache (4 Kurse)'),
          problems: takenAll(neu)
            ? []
            : [
                `${neu.name} (neu einsetzend): 4 Kurse nötig, weil keine fortgeführte Fremdsprache bis Ende Q2 belegt ist.`,
              ],
          meta: { fs: neu.id },
        })
      }
    }
    return options
  })

  // 4 Kurse einer durchgängigen Gesellschaftswissenschaft + ggf. 2 Kurse GE und 2 Kurse SW
  partials = extend(partials, () => {
    const geGroup = () => group('ge', '2 Kurse Geschichte', ofType('GE'))
    const swGroup = () => group('sw', '2 Kurse Sozialwissenschaften', ofType('SW'))
    const full = ofType('GE', 'SW', 'GEO', 'EW', 'PL').filter(takenAll)
    if (full.length === 0) {
      return [
        {
          problems: [
            'Gesellschaftswissenschaft: keine GW (GE, SW, GEO, EW, PL) ist in allen 4 Halbjahren belegt.',
          ],
          groups: [geGroup(), swGroup()],
        },
      ]
    }
    return full.map((g) => ({
      choices: [{ label: 'Durchgängige Gesellschaftswissenschaft', value: g.name }],
      fixed: fixedOf(g, 'Durchgängige Gesellschaftswissenschaft (4 Kurse)'),
      groups: [...(g.type !== 'GE' ? [geGroup()] : []), ...(g.type !== 'SW' ? [swGroup()] : [])],
    }))
  })

  // 4 Kurse einer durchgängigen Naturwissenschaft (bei naturwiss. Schwerpunkt auch IF)
  const naturwissenschaftlich = settings.schwerpunkt === 'naturwissenschaftlich'
  partials = extend(partials, () => {
    const types: SubjectType[] = naturwissenschaftlich ? ['BI', 'CH', 'PH', 'IF'] : ['BI', 'CH', 'PH']
    const full = ofType(...types).filter(takenAll)
    if (full.length === 0) {
      return [
        {
          problems: [
            `Naturwissenschaft: keine Naturwissenschaft (${naturwissenschaftlich ? 'BI, CH, PH oder IF' : 'BI, CH oder PH'}) ist in allen 4 Halbjahren belegt.`,
          ],
        },
      ]
    }
    return full.map((s) => ({
      choices: [{ label: 'Durchgängige Naturwissenschaft', value: s.name }],
      fixed: fixedOf(s, 'Durchgängige Naturwissenschaft (4 Kurse)'),
      meta: { nw: s.id },
    }))
  })

  // 2 Kurse der Q2 aus dem Schwerpunktfach
  partials = extend(partials, (p) => {
    if (!naturwissenschaftlich) {
      const candidates = ofType('FS').filter((s) => s.id !== p.meta.fs && takenQ2(s))
      if (candidates.length === 0) {
        return [{ problems: ['Schwerpunkt (sprachlich): keine weitere Fremdsprache ist in Q2.1 und Q2.2 belegt.'] }]
      }
      return candidates.map((s) => ({
        choices: [{ label: 'Schwerpunktfach (2 Kurse der Q2)', value: s.name }],
        fixed: fixedOf(s, 'Schwerpunkt: weitere Fremdsprache (Q2)', Q2),
      }))
    }
    const candidates = ofType('BI', 'CH', 'PH', 'IF').filter((s) => s.id !== p.meta.nw && takenQ2(s))
    if (candidates.length === 0) {
      return [
        {
          problems: [
            'Schwerpunkt (naturwissenschaftlich): kein weiteres Fach aus BI, CH, PH, IF ist in Q2.1 und Q2.2 belegt.',
          ],
        },
      ]
    }
    return candidates.map((s) => ({
      choices: [{ label: 'Schwerpunktfach (2 Kurse der Q2)', value: s.name }],
      fixed: fixedOf(s, 'Schwerpunkt: weiteres Fach aus Aufgabenfeld III (Q2)', Q2),
    }))
  })

  // Projektkurs: als 2 GK (nur gemeinsam) oder gar nicht
  for (const pk of ofType('PK')) {
    const mode = projectModeOf(pk)
    if (mode === 'none' || mode === 'bll') continue
    const included: Option = {
      choices: [{ label: pk.name, value: 'als 2 GK eingebracht' }],
      fixed: fixedOf(pk, 'Projektkurs (als 2 GK)'),
    }
    const excluded: Option = { choices: [{ label: pk.name, value: 'nicht eingebracht' }] }
    partials = extend(partials, () => (mode === 'gk' ? [included] : [included, excluded]))
  }

  const seen = new Set<string>()
  const variants: Variant[] = []
  for (const p of partials) {
    const key = variantKey(p)
    if (seen.has(key)) continue
    seen.add(key)
    variants.push({
      key,
      choices: p.choices,
      fixed: p.fixed,
      groups: p.groups,
      problems: [...new Set(p.problems)],
    })
  }
  return variants
}
