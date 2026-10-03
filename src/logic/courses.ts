/** Fächer → einzelne Halbjahreskurse */
import type { AppState, ProjectMode, Sem, Subject, SubjectType } from './types'
import { SEMESTERS, SEMESTER_LABELS } from './types'

export interface Course {
  /** `${subjectId}#${sem}` */
  id: string
  subject: Subject
  subjectIndex: number
  sem: Sem
  type: SubjectType
  isLK: boolean
  /** LK zählen doppelt */
  weight: 1 | 2
  /** null = keine Note/Prognose eingetragen */
  points: number | null
  /** Halbjahr ohne Zeugnis → der Wert ist eine Prognose */
  isForecast: boolean
  /** kann grundsätzlich in Block I eingebracht werden (unabhängig von den Punkten) */
  includable: boolean
}

export function courseId(subjectId: string, sem: Sem): string {
  return `${subjectId}#${sem}`
}

export function projectModeOf(subject: Subject): ProjectMode {
  return subject.projectMode ?? 'auto'
}

/** Vertiefungskurse nie; Projektkurse nur im Modus „automatisch“ oder „als 2 GK“ */
export function subjectIncludable(subject: Subject): boolean {
  if (subject.type === 'VTF') return false
  if (subject.type === 'PK') {
    const mode = projectModeOf(subject)
    return mode === 'auto' || mode === 'gk'
  }
  return true
}

/** Projekt- und Vertiefungskurse sind immer Grundkurse */
export function isLKSubject(subject: Subject): boolean {
  return subject.level === 'LK' && subject.type !== 'PK' && subject.type !== 'VTF'
}

/** Alle belegten Halbjahreskurse in Fach-Reihenfolge */
export function deriveCourses(state: AppState): Course[] {
  const courses: Course[] = []
  state.subjects.forEach((subject, subjectIndex) => {
    const isLK = isLKSubject(subject)
    const includable = subjectIncludable(subject)
    for (const sem of SEMESTERS) {
      if (!subject.taken[sem]) continue
      courses.push({
        id: courseId(subject.id, sem),
        subject,
        subjectIndex,
        sem,
        type: subject.type,
        isLK,
        weight: isLK ? 2 : 1,
        points: subject.points[sem],
        isForecast: !state.settings.semesterFinal[sem],
        includable,
      })
    }
  })
  return courses
}

/** Zählt für „Kurse belegt“: alle anrechenbaren Kurse, also alles außer Vertiefungskursen */
export function isCountable(course: Course): boolean {
  return course.type !== 'VTF'
}

/** z. B. "Mathematik Q1.2" */
export function courseLabel(course: Course): string {
  return `${course.subject.name} ${SEMESTER_LABELS[course.sem]}`
}

/** Sortierung „beste zuerst“: Punkte absteigend, dann Halbjahr, dann Fach-Reihenfolge (deterministisch) */
export function compareBestFirst(a: Course, b: Course): number {
  const pa = a.points ?? -1
  const pb = b.points ?? -1
  if (pa !== pb) return pb - pa
  if (a.sem !== b.sem) return a.sem - b.sem
  return a.subjectIndex - b.subjectIndex
}
