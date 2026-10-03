/** Fächerkatalog zum schnellen Hinzufügen (NRW-übliche Fächer) */
import type { Quad, Subject, SubjectType } from './types'

export interface CatalogEntry {
  key: string
  name: string
  short: string
  type: SubjectType
}

export const CATALOG: CatalogEntry[] = [
  { key: 'D', name: 'Deutsch', short: 'D', type: 'D' },
  { key: 'E', name: 'Englisch', short: 'E', type: 'FS' },
  { key: 'F', name: 'Französisch', short: 'F', type: 'FS' },
  { key: 'L', name: 'Latein', short: 'L', type: 'FS' },
  { key: 'S', name: 'Spanisch', short: 'S', type: 'FS' },
  { key: 'KU', name: 'Kunst', short: 'KU', type: 'KU' },
  { key: 'MU', name: 'Musik', short: 'MU', type: 'MU' },
  { key: 'LI', name: 'Literatur', short: 'LI', type: 'LI' },
  { key: 'GE', name: 'Geschichte', short: 'GE', type: 'GE' },
  { key: 'SW', name: 'Sozialwissenschaften', short: 'SW', type: 'SW' },
  { key: 'GEO', name: 'Geographie', short: 'GEO', type: 'GEO' },
  { key: 'EW', name: 'Erziehungswissenschaft', short: 'EW', type: 'EW' },
  { key: 'PL', name: 'Philosophie', short: 'PL', type: 'PL' },
  { key: 'KR', name: 'Katholische Religionslehre', short: 'KR', type: 'REL' },
  { key: 'ER', name: 'Evangelische Religionslehre', short: 'ER', type: 'REL' },
  { key: 'M', name: 'Mathematik', short: 'M', type: 'M' },
  { key: 'BI', name: 'Biologie', short: 'BI', type: 'BI' },
  { key: 'CH', name: 'Chemie', short: 'CH', type: 'CH' },
  { key: 'PH', name: 'Physik', short: 'PH', type: 'PH' },
  { key: 'IF', name: 'Informatik', short: 'IF', type: 'IF' },
  { key: 'SP', name: 'Sport', short: 'SP', type: 'SP' },
  { key: 'PK', name: 'Projektkurs', short: 'PK', type: 'PK' },
  { key: 'VTF-D', name: 'Vertiefungskurs Deutsch', short: 'VD', type: 'VTF' },
  { key: 'VTF-M', name: 'Vertiefungskurs Mathematik', short: 'VM', type: 'VTF' },
  { key: 'VTF-E', name: 'Vertiefungskurs Englisch', short: 'VE', type: 'VTF' },
]

/** Übliche Belegung beim Hinzufügen: Literatur, Projekt- und Vertiefungskurse nur in der Q1 */
export function defaultTaken(type: SubjectType): Quad<boolean> {
  if (type === 'LI' || type === 'PK' || type === 'VTF') return [true, true, false, false]
  return [true, true, true, true]
}

let idCounter = 0

/** Eindeutige ID für neue Fächer */
export function newSubjectId(): string {
  idCounter += 1
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `s-${random}-${idCounter}`
}

export function createSubject(fields: { name: string; short: string; type: SubjectType; id?: string }): Subject {
  const subject: Subject = {
    id: fields.id ?? newSubjectId(),
    name: fields.name,
    short: fields.short,
    type: fields.type,
    level: 'GK',
    abiFach: null,
    taken: defaultTaken(fields.type),
    points: [null, null, null, null],
  }
  if (fields.type === 'FS') subject.newLanguage = false
  if (fields.type === 'PK') subject.projectMode = 'auto'
  return subject
}
