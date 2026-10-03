/** Vorlage: Kursbelegung Q1.1–Q2.2 (ohne Noten) */
import { createSubject } from './catalog'
import type { AbiFach, AppState, Level, Subject, SubjectType } from './types'

function templateSubject(
  id: string,
  name: string,
  short: string,
  type: SubjectType,
  level: Level,
  abiFach: AbiFach | null,
): Subject {
  return { ...createSubject({ id, name, short, type }), level, abiFach }
}

/** Fächer der Vorlage: Mathematik-LK und Chemie-LK, naturwissenschaftlicher Schwerpunkt */
export function templateSubjects(): Subject[] {
  return [
    templateSubject('m', 'Mathematik', 'M', 'M', 'LK', 1),
    templateSubject('ch', 'Chemie', 'CH', 'CH', 'LK', 2),
    templateSubject('d', 'Deutsch', 'D', 'D', 'GK', 3),
    templateSubject('sw', 'Sozialwissenschaften', 'SW', 'SW', 'GK', 4),
    templateSubject('e', 'Englisch', 'E', 'FS', 'GK', null),
    templateSubject('mu', 'Musik', 'MU', 'MU', 'GK', null),
    templateSubject('ge', 'Geschichte', 'GE', 'GE', 'GK', null),
    templateSubject('ph', 'Physik', 'PH', 'PH', 'GK', null),
    templateSubject('if', 'Informatik', 'IF', 'IF', 'GK', null),
    templateSubject('kr', 'Katholische Religionslehre', 'KR', 'REL', 'GK', null),
    templateSubject('sp', 'Sport', 'SP', 'SP', 'GK', null),
  ]
}

export function createTemplateState(): AppState {
  return {
    version: 1,
    subjects: templateSubjects(),
    settings: {
      schwerpunkt: 'naturwissenschaftlich',
      philosophyReplacesReligion: false,
      weeklyHoursOk: false,
      semesterFinal: [false, false, false, false],
    },
    exams: {
      written: [null, null, null],
      oral: [null, null, null],
      fourth: null,
    },
    goals: {
      targetGrade: '1,0',
      blockITarget: null,
    },
  }
}

/** Leere Fächerliste für Nutzer mit ganz anderer Belegung */
export function createEmptyState(): AppState {
  return { ...createTemplateState(), subjects: [] }
}
