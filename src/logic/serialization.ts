/** Export/Import als JSON und Prüfung gespeicherter Daten */
import { GRADE_OPTIONS } from './grade'
import { isValidPoints } from './points'
import type { AbiFach, AppState, Exams, Goals, ProjectMode, Quad, Settings, Subject, SubjectType } from './types'
import { SUBJECT_TYPES } from './types'

export const STORAGE_KEY = 'abi-rechner-hildegardis:v1'
export const APP_ID = 'abi-rechner-hildegardis'

export interface ExportFile {
  app: typeof APP_ID
  version: 1
  exportedAt: string
  state: AppState
}

export type ParseResult = { ok: true; state: AppState } | { ok: false; error: string }

export function createExport(state: AppState, now: Date = new Date()): ExportFile {
  return { app: APP_ID, version: 1, exportedAt: now.toISOString(), state }
}

export function exportFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `abi-rechner-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

class ValidationError extends Error {}

function fail(message: string): never {
  throw new ValidationError(message)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readBool(value: unknown, where: string): boolean {
  if (typeof value !== 'boolean') fail(`${where}: Ja/Nein-Wert erwartet.`)
  return value
}

function readPointsOrNull(value: unknown, where: string): number | null {
  if (value === null) return null
  if (!isValidPoints(value)) fail(`${where}: Punktzahl 0–15 oder leer erwartet.`)
  return value
}

function readQuad<T>(value: unknown, where: string, read: (v: unknown, w: string) => T): Quad<T> {
  if (!Array.isArray(value) || value.length !== 4) fail(`${where}: 4 Werte (Q1.1–Q2.2) erwartet.`)
  return [read(value[0], `${where} Q1.1`), read(value[1], `${where} Q1.2`), read(value[2], `${where} Q2.1`), read(value[3], `${where} Q2.2`)]
}

function readTriple(value: unknown, where: string): [number | null, number | null, number | null] {
  if (!Array.isArray(value) || value.length !== 3) fail(`${where}: 3 Werte erwartet.`)
  return [
    readPointsOrNull(value[0], `${where} (1. Fach)`),
    readPointsOrNull(value[1], `${where} (2. Fach)`),
    readPointsOrNull(value[2], `${where} (3. Fach)`),
  ]
}

const PROJECT_MODES: readonly ProjectMode[] = ['auto', 'gk', 'none', 'bll']

function readSubject(value: unknown, index: number): Subject {
  const where = `Fach ${index + 1}`
  if (!isObject(value)) fail(`${where}: ungültiger Eintrag.`)
  const { id, name, short, type, level, abiFach, taken, points, newLanguage, projectMode } = value
  if (typeof id !== 'string' || id.trim() === '') fail(`${where}: ID fehlt.`)
  if (typeof name !== 'string' || name.trim() === '') fail(`${where}: Name fehlt.`)
  if (typeof short !== 'string') fail(`${where}: Kürzel fehlt.`)
  if (typeof type !== 'string' || !SUBJECT_TYPES.includes(type as SubjectType)) fail(`${where}: unbekannter Fachtyp.`)
  if (level !== 'GK' && level !== 'LK') fail(`${where}: Kursart muss GK oder LK sein.`)
  if (abiFach !== null && abiFach !== 1 && abiFach !== 2 && abiFach !== 3 && abiFach !== 4) {
    fail(`${where}: Abifach muss 1–4 oder leer sein.`)
  }
  const subject: Subject = {
    id,
    name: name.trim(),
    short: short.trim(),
    type: type as SubjectType,
    level,
    abiFach: abiFach as AbiFach | null,
    taken: readQuad(taken, `${where} (${name}), belegt`, readBool),
    points: readQuad(points, `${where} (${name}), Punkte`, readPointsOrNull),
  }
  if (subject.type === 'FS') {
    subject.newLanguage = newLanguage === undefined ? false : readBool(newLanguage, `${where}: neu einsetzend`)
  }
  if (subject.type === 'PK') {
    if (projectMode !== undefined && !PROJECT_MODES.includes(projectMode as ProjectMode)) {
      fail(`${where}: ungültiger Projektkurs-Modus.`)
    }
    subject.projectMode = (projectMode as ProjectMode | undefined) ?? 'auto'
  }
  return subject
}

function readSettings(value: unknown): Settings {
  if (!isObject(value)) fail('Einstellungen fehlen.')
  const { schwerpunkt, philosophyReplacesReligion, weeklyHoursOk, semesterFinal } = value
  if (schwerpunkt !== 'sprachlich' && schwerpunkt !== 'naturwissenschaftlich') fail('Einstellungen: ungültiger Schwerpunkt.')
  return {
    schwerpunkt,
    philosophyReplacesReligion: readBool(philosophyReplacesReligion, 'Einstellungen: Philosophie als Ersatzfach'),
    weeklyHoursOk: readBool(weeklyHoursOk, 'Einstellungen: Wochenstunden'),
    semesterFinal: readQuad(semesterFinal, 'Einstellungen: Zeugnis liegt vor', readBool),
  }
}

function readExams(value: unknown): Exams {
  if (!isObject(value)) fail('Prüfungsdaten fehlen.')
  return {
    written: readTriple(value.written, 'Prüfungen schriftlich'),
    oral: readTriple(value.oral, 'Mündliche Nachprüfungen'),
    fourth: readPointsOrNull(value.fourth, 'Prüfung 4. Fach'),
  }
}

/** Ziele sind unkritisch: ungültige Werte fallen auf Standardwerte zurück. */
function readGoals(value: unknown): Goals {
  const goals: Goals = { targetGrade: '1,0', blockITarget: null }
  if (!isObject(value)) return goals
  if (typeof value.targetGrade === 'string' && GRADE_OPTIONS.includes(value.targetGrade)) goals.targetGrade = value.targetGrade
  const target = value.blockITarget
  if (typeof target === 'number' && Number.isInteger(target) && target >= 200 && target <= 600) goals.blockITarget = target
  return goals
}

/** Prüft und normalisiert einen gespeicherten bzw. importierten Zustand. */
export function validateState(data: unknown): ParseResult {
  try {
    if (!isObject(data)) fail('Unbekanntes Dateiformat.')
    if (data.version !== 1) fail('Unbekannte Version der Daten.')
    if (!Array.isArray(data.subjects)) fail('Fächerliste fehlt.')
    const subjects = data.subjects.map(readSubject)
    const ids = new Set<string>()
    for (const s of subjects) {
      if (ids.has(s.id)) fail(`Doppelte Fach-ID „${s.id}“.`)
      ids.add(s.id)
    }
    return {
      ok: true,
      state: {
        version: 1,
        subjects,
        settings: readSettings(data.settings),
        exams: readExams(data.exams),
        goals: readGoals(data.goals),
      },
    }
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.message }
    throw error
  }
}

/** Liest eine Export-Datei (oder einen reinen Zustand) aus Text. */
export function parseImport(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' }
  }
  if (isObject(data) && 'app' in data) {
    if (data.app !== APP_ID) return { ok: false, error: 'Die Datei stammt nicht aus diesem Abi-Rechner.' }
    return validateState(data.state)
  }
  return validateState(data)
}

/** Für localStorage: liefert null, wenn nichts oder Ungültiges gespeichert ist. */
export function parseStoredState(raw: string | null): AppState | null {
  if (raw === null) return null
  const result = parseImport(raw)
  return result.ok ? result.state : null
}
