/** Formeln und Grenzen für Block I (laut Schulpräsentation) */
import { roundHalfUpFraction } from './points'

/** Es werden zwischen 35 und 40 Halbjahresnoten eingebracht. */
export const MIN_COURSES = 35
export const MAX_COURSES = 40
/** Höchstens 3 Defizite in Leistungskursen */
export const MAX_LK_DEFICITS = 3
export const MIN_BLOCK_I = 200
export const MAX_BLOCK_I = 600

/**
 * Block I = round((P / S) × 40), kaufmännisch auf ganze Zahl gerundet.
 * P = Punktsumme (LK doppelt), S = Anzahl Kurse (LK doppelt).
 */
export function blockIScore(P: number, S: number): number {
  if (S <= 0) return 0
  return roundHalfUpFraction(P * 40, S)
}

/** 35–37 eingebrachte Kurse: max. 7 Defizite; 38–40 Kurse: max. 8 Defizite */
export function deficitLimit(courseCount: number): number {
  return courseCount >= 38 ? 8 : 7
}

export interface DeficitIssue {
  code: 'deficits' | 'lk-deficits'
  message: string
}

export interface DeficitCheck {
  ok: boolean
  maxDeficits: number
  issues: DeficitIssue[]
}

/** Prüft die Defizitgrenzen für eine Anzahl eingebrachter Kurse. */
export function checkDeficits(courseCount: number, deficits: number, lkDeficits: number): DeficitCheck {
  const maxDeficits = deficitLimit(courseCount)
  const issues: DeficitIssue[] = []
  if (deficits > maxDeficits) {
    issues.push({
      code: 'deficits',
      message: `${deficits} Defizite – bei ${courseCount} eingebrachten Kursen sind höchstens ${maxDeficits} erlaubt.`,
    })
  }
  if (lkDeficits > MAX_LK_DEFICITS) {
    issues.push({
      code: 'lk-deficits',
      message: `${lkDeficits} Defizite in Leistungskursen – höchstens ${MAX_LK_DEFICITS} erlaubt.`,
    })
  }
  return { ok: issues.length === 0, maxDeficits, issues }
}
