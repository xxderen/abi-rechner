/** Gesamtqualifikation → Durchschnittsnote, exakt nach der Tabelle der Schule (nicht per Formel) */

export interface GradeBand {
  grade: string
  min: number
  max: number
}

export const MIN_TOTAL = 300
export const MAX_TOTAL = 900

export const GRADE_TABLE: readonly GradeBand[] = [
  { grade: '1,0', min: 823, max: 900 },
  { grade: '1,1', min: 805, max: 822 },
  { grade: '1,2', min: 787, max: 804 },
  { grade: '1,3', min: 769, max: 786 },
  { grade: '1,4', min: 751, max: 768 },
  { grade: '1,5', min: 733, max: 750 },
  { grade: '1,6', min: 715, max: 732 },
  { grade: '1,7', min: 697, max: 714 },
  { grade: '1,8', min: 679, max: 696 },
  { grade: '1,9', min: 661, max: 678 },
  { grade: '2,0', min: 643, max: 660 },
  { grade: '2,1', min: 625, max: 642 },
  { grade: '2,2', min: 607, max: 624 },
  { grade: '2,3', min: 589, max: 606 },
  { grade: '2,4', min: 571, max: 588 },
  { grade: '2,5', min: 553, max: 570 },
  { grade: '2,6', min: 535, max: 552 },
  { grade: '2,7', min: 517, max: 534 },
  { grade: '2,8', min: 499, max: 516 },
  { grade: '2,9', min: 481, max: 498 },
  { grade: '3,0', min: 463, max: 480 },
  { grade: '3,1', min: 445, max: 462 },
  { grade: '3,2', min: 427, max: 444 },
  { grade: '3,3', min: 409, max: 426 },
  { grade: '3,4', min: 391, max: 408 },
  { grade: '3,5', min: 373, max: 390 },
  { grade: '3,6', min: 355, max: 372 },
  { grade: '3,7', min: 337, max: 354 },
  { grade: '3,8', min: 319, max: 336 },
  { grade: '3,9', min: 301, max: 318 },
  { grade: '4,0', min: 300, max: 300 },
]

export const GRADE_OPTIONS: readonly string[] = GRADE_TABLE.map((b) => b.grade)

function bandIndex(total: number): number {
  if (!Number.isInteger(total)) return -1
  return GRADE_TABLE.findIndex((b) => total >= b.min && total <= b.max)
}

export function gradeBandForTotal(total: number): GradeBand | null {
  const i = bandIndex(total)
  return i === -1 ? null : GRADE_TABLE[i]
}

/** z. B. 589 → "2,3"; unter 300 (oder über 900) → null */
export function gradeForTotal(total: number): string | null {
  return gradeBandForTotal(total)?.grade ?? null
}

export function minTotalForGrade(grade: string): number | null {
  return GRADE_TABLE.find((b) => b.grade === grade)?.min ?? null
}

export interface GradeChange {
  band: GradeBand
  /** nächstbessere Note und wie viele Punkte bis dahin fehlen */
  better: { band: GradeBand; missing: number } | null
  /** schlechtere Note, sobald die Punktzahl unter `threshold` fällt; `buffer` = Punkte, die man verlieren darf */
  worse: { band: GradeBand | null; threshold: number; buffer: number }
}

/** Kasten „Änderung der Durchschnittsnote“ */
export function gradeChange(total: number): GradeChange | null {
  const i = bandIndex(total)
  if (i === -1) return null
  const band = GRADE_TABLE[i]
  const betterBand = i > 0 ? GRADE_TABLE[i - 1] : null
  return {
    band,
    better: betterBand ? { band: betterBand, missing: betterBand.min - total } : null,
    worse: { band: GRADE_TABLE[i + 1] ?? null, threshold: band.min, buffer: total - band.min },
  }
}
