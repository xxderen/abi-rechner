/** Zustandsänderungen (rein, ohne Browser-Zugriff) */
import type { FillStrategy } from '../logic/forecast'
import { fillEmptyForecasts } from '../logic/forecast'
import { createEmptyState, createTemplateState } from '../logic/template'
import type { AbiFach, AppState, Goals, Level, Sem, Settings, Subject, SubjectType } from '../logic/types'

export type Action =
  | { type: 'setPoints'; subjectId: string; sem: Sem; points: number | null }
  | { type: 'updateSubject'; subjectId: string; patch: Partial<Pick<Subject, 'name' | 'short' | 'taken' | 'newLanguage' | 'projectMode'>> }
  | { type: 'setSubjectType'; subjectId: string; subjectType: SubjectType }
  | { type: 'setLevel'; subjectId: string; level: Level }
  | { type: 'setAbiFach'; subjectId: string; abiFach: AbiFach | null }
  | { type: 'addSubject'; subject: Subject }
  | { type: 'removeSubject'; subjectId: string }
  | { type: 'moveSubject'; subjectId: string; direction: -1 | 1 }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'setSemesterFinal'; sem: Sem; final: boolean }
  | { type: 'setExam'; kind: 'written' | 'oral'; index: 0 | 1 | 2; points: number | null }
  | { type: 'setFourthExam'; points: number | null }
  | { type: 'setGoals'; patch: Partial<Goals> }
  | { type: 'fillForecasts'; strategy: FillStrategy }
  | { type: 'replace'; state: AppState }
  | { type: 'reset'; mode: 'template' | 'empty' }

function mapSubject(state: AppState, id: string, update: (s: Subject) => Subject): AppState {
  return { ...state, subjects: state.subjects.map((s) => (s.id === id ? update(s) : s)) }
}

const isSpecial = (type: SubjectType) => type === 'PK' || type === 'VTF'

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setPoints':
      return mapSubject(state, action.subjectId, (s) => {
        const points = [...s.points] as Subject['points']
        points[action.sem] = action.points
        return { ...s, points }
      })

    case 'updateSubject':
      return mapSubject(state, action.subjectId, (s) => ({ ...s, ...action.patch }))

    case 'setSubjectType':
      return mapSubject(state, action.subjectId, (s) => {
        const next: Subject = { ...s, type: action.subjectType }
        delete next.newLanguage
        delete next.projectMode
        if (action.subjectType === 'FS') next.newLanguage = s.newLanguage ?? false
        if (action.subjectType === 'PK') next.projectMode = s.projectMode ?? 'auto'
        if (isSpecial(action.subjectType)) {
          next.level = 'GK'
          next.abiFach = null
        }
        return next
      })

    case 'setLevel': {
      const subject = state.subjects.find((s) => s.id === action.subjectId)
      if (!subject || isSpecial(subject.type)) return state
      if (action.level === 'LK') {
        // LK sind das 1. und 2. Abifach: freien Platz automatisch vergeben
        let abiFach = subject.abiFach
        if (abiFach !== 1 && abiFach !== 2) {
          const used = new Set(state.subjects.filter((s) => s.id !== subject.id).map((s) => s.abiFach))
          abiFach = !used.has(1) ? 1 : !used.has(2) ? 2 : null
        }
        return mapSubject(state, subject.id, (s) => ({ ...s, level: 'LK', abiFach }))
      }
      return mapSubject(state, subject.id, (s) => ({
        ...s,
        level: 'GK',
        abiFach: s.abiFach === 1 || s.abiFach === 2 ? null : s.abiFach,
      }))
    }

    case 'setAbiFach': {
      const { subjectId, abiFach } = action
      const subject = state.subjects.find((s) => s.id === subjectId)
      if (!subject || isSpecial(subject.type)) return state
      return {
        ...state,
        subjects: state.subjects.map((s) => {
          if (s.id === subjectId) {
            if (abiFach === null) return { ...s, abiFach: null, level: s.level === 'LK' ? 'GK' : s.level }
            // 1./2. Abifach = LK, 3./4. Abifach = GK
            return { ...s, abiFach, level: abiFach <= 2 ? 'LK' : 'GK' }
          }
          // Ein Abifach kann nur einmal vergeben werden
          if (abiFach !== null && s.abiFach === abiFach) {
            return { ...s, abiFach: null, level: abiFach <= 2 ? 'GK' : s.level }
          }
          return s
        }),
      }
    }

    case 'addSubject':
      return { ...state, subjects: [...state.subjects, action.subject] }

    case 'removeSubject':
      return { ...state, subjects: state.subjects.filter((s) => s.id !== action.subjectId) }

    case 'moveSubject': {
      const index = state.subjects.findIndex((s) => s.id === action.subjectId)
      const target = index + action.direction
      if (index === -1 || target < 0 || target >= state.subjects.length) return state
      const subjects = [...state.subjects]
      ;[subjects[index], subjects[target]] = [subjects[target], subjects[index]]
      return { ...state, subjects }
    }

    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'setSemesterFinal': {
      const semesterFinal = [...state.settings.semesterFinal] as Settings['semesterFinal']
      semesterFinal[action.sem] = action.final
      return { ...state, settings: { ...state.settings, semesterFinal } }
    }

    case 'setExam': {
      const list = [...state.exams[action.kind]] as AppState['exams']['written']
      list[action.index] = action.points
      return { ...state, exams: { ...state.exams, [action.kind]: list } }
    }

    case 'setFourthExam':
      return { ...state, exams: { ...state.exams, fourth: action.points } }

    case 'setGoals':
      return { ...state, goals: { ...state.goals, ...action.patch } }

    case 'fillForecasts':
      return fillEmptyForecasts(state, action.strategy).state

    case 'replace':
      return action.state

    case 'reset':
      return action.mode === 'template' ? createTemplateState() : createEmptyState()
  }
}
