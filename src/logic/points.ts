/** Punkte, Noten und kaufmännisches Runden */

export const MIN_POINTS = 0
export const MAX_POINTS = 15

/** Index = Punktzahl: 15/14/13 = 1+/1/1-, …, 03/02/01 = 5+/5/5-, 00 = 6 */
const GRADE_BY_POINTS = [
  '6', '5-', '5', '5+', '4-', '4', '4+', '3-', '3', '3+', '2-', '2', '2+', '1-', '1', '1+',
] as const

/** Note zu einer Punktzahl (0–15), z. B. 11 → "2" */
export function pointsToGrade(points: number): string {
  if (!isValidPoints(points)) throw new RangeError(`Ungültige Punktzahl: ${points}`)
  return GRADE_BY_POINTS[points]
}

/** Ganze Zahl zwischen 0 und 15 */
export function isValidPoints(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_POINTS && value <= MAX_POINTS
}

/**
 * Eingabefeld → Punkte. "" = keine Note (null), "0"–"15" = Punkte,
 * alles andere = ungültig (undefined).
 */
export function parsePointsInput(raw: string): number | null | undefined {
  const text = raw.trim()
  if (text === '') return null
  if (!/^\d{1,2}$/.test(text)) return undefined
  const value = Number(text)
  return isValidPoints(value) ? value : undefined
}

/** Zweistellige Darstellung wie auf den Schulfolien: 8 → "08" */
export function formatPoints(points: number): string {
  return String(points).padStart(2, '0')
}

/** Defizit = unter 5 Punkte (4 Punkte sind bereits ein Defizit) */
export function isDeficit(points: number): boolean {
  return points < 5
}

/**
 * Kaufmännisch gerundeter Wert von numerator / denominator (beide ≥ 0).
 * Bei ganzen Zahlen wird exakt ganzzahlig gerechnet (keine Fließkomma-Fehler,
 * exakt ,5 wird aufgerundet). Bei Kommazahlen (z. B. Was-wäre-wenn mit
 * Durchschnittswerten) wird mit kleiner Toleranz gerundet.
 */
export function roundHalfUpFraction(numerator: number, denominator: number): number {
  if (denominator <= 0) throw new RangeError('Nenner muss positiv sein')
  if (Number.isInteger(numerator) && Number.isInteger(denominator)) {
    return Math.floor((2 * numerator + denominator) / (2 * denominator))
  }
  return Math.floor(numerator / denominator + 0.5 + 1e-9)
}

const decimal1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const decimal2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 11.25 → "11,3" (mathematisch gerundet für die Anzeige) */
export function formatDecimal1(value: number): string {
  return decimal1.format(value)
}

/** 9.3636 → "9,36" */
export function formatDecimal2(value: number): string {
  return decimal2.format(value)
}
