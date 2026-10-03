/** Hinweise zur Konfiguration (Kursarten, Abifächer, fehlende Zeugnisnoten) */
import { isLKSubject, subjectIncludable } from './courses'
import type { AppState } from './types'
import { SEMESTERS, SEMESTER_LABELS } from './types'

export interface ConfigIssue {
  level: 'error' | 'warning'
  message: string
  subjectId?: string
}

export function validateConfig(state: AppState): ConfigIssue[] {
  const issues: ConfigIssue[] = []
  const { subjects } = state

  for (const k of [1, 2, 3, 4] as const) {
    const holders = subjects.filter((s) => s.abiFach === k)
    if (holders.length === 0) {
      issues.push({ level: 'warning', message: `Das ${k}. Abifach ist noch nicht festgelegt.` })
    } else if (holders.length > 1) {
      issues.push({
        level: 'error',
        message: `Das ${k}. Abifach ist mehrfach vergeben (${holders.map((s) => s.name).join(', ')}).`,
      })
    }
  }

  for (const s of subjects) {
    if (s.type === 'PK' || s.type === 'VTF') {
      if (s.abiFach !== null) {
        issues.push({ level: 'error', subjectId: s.id, message: `${s.name}: Projekt- und Vertiefungskurse können kein Abifach sein.` })
      }
      if (s.level === 'LK') {
        issues.push({ level: 'error', subjectId: s.id, message: `${s.name}: Projekt- und Vertiefungskurse sind immer Grundkurse.` })
      }
      continue
    }
    if ((s.abiFach === 1 || s.abiFach === 2) && s.level !== 'LK') {
      issues.push({ level: 'error', subjectId: s.id, message: `${s.name} ist ${s.abiFach}. Abifach und muss Leistungskurs sein.` })
    }
    if ((s.abiFach === 3 || s.abiFach === 4) && s.level === 'LK') {
      issues.push({ level: 'error', subjectId: s.id, message: `${s.name} ist ${s.abiFach}. Abifach und muss Grundkurs sein.` })
    }
    if (s.level === 'LK' && s.abiFach === null) {
      issues.push({
        level: 'warning',
        subjectId: s.id,
        message: `${s.name} ist Leistungskurs, aber kein Abifach – die beiden LK sind das 1. und 2. Abifach.`,
      })
    }
    if (s.abiFach !== null && !s.taken.every(Boolean)) {
      issues.push({
        level: 'error',
        subjectId: s.id,
        message: `${s.name} ist ${s.abiFach}. Abifach und muss in allen 4 Halbjahren belegt sein.`,
      })
    }
  }

  const lkCount = subjects.filter(isLKSubject).length
  if (lkCount !== 2) {
    issues.push({
      level: lkCount > 2 ? 'error' : 'warning',
      message: `Es ${lkCount === 1 ? 'ist 1 Leistungskurs' : `sind ${lkCount} Leistungskurse`} eingetragen – vorgesehen sind genau 2.`,
    })
  }

  for (const pk of subjects.filter((s) => s.type === 'PK')) {
    const semesters = pk.taken.filter(Boolean).length
    if (semesters !== 2) {
      issues.push({
        level: 'warning',
        subjectId: pk.id,
        message: `${pk.name}: Ein Projektkurs umfasst 2 Halbjahre (eingetragen: ${semesters}).`,
      })
    }
  }

  for (const sem of SEMESTERS) {
    if (!state.settings.semesterFinal[sem]) continue
    const missing = subjects.filter((s) => s.taken[sem] && subjectIncludable(s) && s.points[sem] === null)
    if (missing.length > 0) {
      issues.push({
        level: 'warning',
        message: `${SEMESTER_LABELS[sem]}: Das Zeugnis liegt vor, aber ${missing.length === 1 ? 'eine Note fehlt' : `${missing.length} Noten fehlen`} (${missing.map((s) => s.short).join(', ')}).`,
      })
    }
  }

  return issues
}
