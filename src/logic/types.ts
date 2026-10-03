/**
 * Datenmodell des Abi-Rechners.
 * Alles hier ist reine Datenbeschreibung ohne Abhängigkeit von React oder dem Browser.
 */

/** Halbjahre der Qualifikationsphase: 0 = Q1.1, 1 = Q1.2, 2 = Q2.1, 3 = Q2.2 */
export type Sem = 0 | 1 | 2 | 3

export const SEMESTERS: readonly Sem[] = [0, 1, 2, 3]
export const SEMESTER_LABELS = ['Q1.1', 'Q1.2', 'Q2.1', 'Q2.2'] as const

/** Vier Werte, einer pro Halbjahr */
export type Quad<T> = [T, T, T, T]

/**
 * Fachtyp – steuert, welche Pflicht-Regeln für ein Fach gelten.
 * Name und Kürzel eines Fachs sind frei wählbar, der Typ ist entscheidend.
 */
export type SubjectType =
  | 'D' // Deutsch
  | 'FS' // Fremdsprache
  | 'KU' // Kunst
  | 'MU' // Musik
  | 'LI' // Literatur
  | 'GE' // Geschichte
  | 'SW' // Sozialwissenschaften
  | 'GEO' // Geographie
  | 'EW' // Erziehungswissenschaft
  | 'PL' // Philosophie
  | 'REL' // Religionslehre
  | 'M' // Mathematik
  | 'BI' // Biologie
  | 'CH' // Chemie
  | 'PH' // Physik
  | 'IF' // Informatik
  | 'SP' // Sport
  | 'PK' // Projektkurs
  | 'VTF' // Vertiefungskurs
  | 'SONST' // sonstiges Fach ohne Pflicht-Regel

export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  D: 'Deutsch',
  FS: 'Fremdsprache',
  KU: 'Kunst',
  MU: 'Musik',
  LI: 'Literatur',
  GE: 'Geschichte',
  SW: 'Sozialwissenschaften',
  GEO: 'Geographie',
  EW: 'Erziehungswissenschaft',
  PL: 'Philosophie',
  REL: 'Religionslehre',
  M: 'Mathematik',
  BI: 'Biologie',
  CH: 'Chemie',
  PH: 'Physik',
  IF: 'Informatik',
  SP: 'Sport',
  PK: 'Projektkurs',
  VTF: 'Vertiefungskurs',
  SONST: 'Sonstiges Fach (ohne Pflicht-Regel)',
}

export const SUBJECT_TYPES = Object.keys(SUBJECT_TYPE_LABELS) as SubjectType[]

export type Level = 'GK' | 'LK'
export type AbiFach = 1 | 2 | 3 | 4

/**
 * Einbringung eines Projektkurses:
 * auto = der Optimierer entscheidet (als 2 GK oder gar nicht),
 * gk = immer als 2 GK, none = nicht einbringen,
 * bll = besondere Lernleistung (fällt aus Block I; BLL-Wertung in Block II nicht abgebildet)
 */
export type ProjectMode = 'auto' | 'gk' | 'none' | 'bll'

export const PROJECT_MODE_LABELS: Record<ProjectMode, string> = {
  auto: 'Automatisch (Optimierer entscheidet)',
  gk: 'Immer als 2 GK einbringen',
  none: 'Nicht einbringen',
  bll: 'Besondere Lernleistung (5. Abifach)',
}

export type Schwerpunkt = 'sprachlich' | 'naturwissenschaftlich'

export interface Subject {
  id: string
  name: string
  short: string
  type: SubjectType
  level: Level
  abiFach: AbiFach | null
  /** belegt je Halbjahr */
  taken: Quad<boolean>
  /** Punkte 0–15 je Halbjahr, null = noch keine Note/Prognose */
  points: Quad<number | null>
  /** nur Fremdsprachen: in der EF neu einsetzende Fremdsprache */
  newLanguage?: boolean
  /** nur Projektkurse */
  projectMode?: ProjectMode
}

export interface Settings {
  schwerpunkt: Schwerpunkt
  /** Philosophie ersetzt Religionslehre bei den Pflicht-Wertungskursen */
  philosophyReplacesReligion: boolean
  /** Durchschnittliche Wochenstundenzahl 34 – selbst bestätigt (die App kennt keine Stunden) */
  weeklyHoursOk: boolean
  /** „Zeugnis liegt vor“: Werte dieses Halbjahres sind echte Noten, sonst Prognosen */
  semesterFinal: Quad<boolean>
}

export interface Exams {
  /** Prüfungsergebnisse (0–15) der schriftlichen Fächer 1–3 */
  written: [number | null, number | null, number | null]
  /** mündliche Nachprüfung in Fach 1–3 (optional) */
  oral: [number | null, number | null, number | null]
  /** mündliche Prüfung im 4. Fach */
  fourth: number | null
}

export interface Goals {
  /** Zielnote, z. B. "1,0" */
  targetGrade: string
  /** Ziel für Block I (200–600) für die Rest-Schnitt-Rechnung */
  blockITarget: number | null
}

export interface AppState {
  version: 1
  subjects: Subject[]
  settings: Settings
  exams: Exams
  goals: Goals
}
