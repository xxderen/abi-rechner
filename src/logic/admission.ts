/** Zulassungsvoraussetzungen (Block I) */
import { MAX_LK_DEFICITS, MIN_BLOCK_I } from './blockI'
import type { Course } from './courses'
import { isCountable } from './courses'
import type { OptimizerResult } from './optimizer'
import { DEFICIT_CODES, PFLICHT_CODES } from './optimizer'
import type { Settings } from './types'

export const MIN_TAKEN_TOTAL = 38
export const MIN_TAKEN_GK = 30
export const MIN_TAKEN_LK = 8

/** ok = ✔, fail = ✘, unknown = ? (nicht bestätigt), open = noch nicht berechenbar */
export type CriterionStatus = 'ok' | 'fail' | 'unknown' | 'open'

export interface Criterion {
  id: 1 | 2 | 3 | 4 | 5
  title: string
  status: CriterionStatus
  detail: string
  messages: string[]
}

export type AdmissionStatus = 'admitted' | 'admitted-pending-hours' | 'not-admitted' | 'open'

export interface TakenCount {
  total: number
  gk: number
  lk: number
}

export interface AdmissionResult {
  status: AdmissionStatus
  criteria: Criterion[]
  taken: TakenCount
}

/** Gezählt werden alle anrechenbaren Kurse der Q-Phase (alle außer Vertiefungskursen). */
export function countTaken(courses: Course[]): TakenCount {
  const countable = courses.filter(isCountable)
  const lk = countable.filter((c) => c.isLK).length
  return { total: countable.length, gk: countable.length - lk, lk }
}

export function evaluateAdmission(settings: Settings, courses: Course[], optimizer: OptimizerResult): AdmissionResult {
  const taken = countTaken(courses)

  const takenMessages: string[] = []
  if (taken.total < MIN_TAKEN_TOTAL) takenMessages.push(`Es fehlen ${MIN_TAKEN_TOTAL - taken.total} Kurse.`)
  if (taken.lk < MIN_TAKEN_LK) takenMessages.push(`Nur ${taken.lk} LK-Kurse – ${MIN_TAKEN_LK} nötig.`)
  if (taken.gk < MIN_TAKEN_GK) takenMessages.push(`Nur ${taken.gk} GK-Kurse – ${MIN_TAKEN_GK} nötig.`)
  const c1: Criterion = {
    id: 1,
    title: 'Mindestens 38 Kurse belegt (30 GK, 8 LK)',
    status: takenMessages.length === 0 ? 'ok' : 'fail',
    detail: `${taken.total} Kurse belegt (${taken.gk} GK, ${taken.lk} LK)`,
    messages: takenMessages,
  }

  const c2: Criterion = {
    id: 2,
    title: 'Durchschnittliche Wochenstundenzahl 34',
    status: settings.weeklyHoursOk ? 'ok' : 'unknown',
    detail: settings.weeklyHoursOk
      ? 'Von dir bestätigt.'
      : 'Die App kennt deine Wochenstunden nicht – bitte selbst prüfen und bestätigen.',
    messages: [],
  }

  let c3: Criterion
  let c4: Criterion
  let c5: Criterion
  const titles = {
    3: 'Alle Pflicht-Wertungskurse belegt, keiner mit 0 Punkten',
    4: 'Defizite: max. 7 (bei 35–37 Kursen) bzw. 8 (bei 38–40 Kursen), davon max. 3 im LK',
    5: 'Punktzahl Block I mindestens 200',
  } as const

  const selection = optimizer.display
  if (optimizer.status === 'incomplete' || !selection) {
    const detail = `Noch ${optimizer.missing.length} ${optimizer.missing.length === 1 ? 'Kurs' : 'Kurse'} ohne Note oder Prognose.`
    c3 = { id: 3, title: titles[3], status: 'open', detail, messages: [] }
    c4 = { id: 4, title: titles[4], status: 'open', detail, messages: [] }
    c5 = { id: 5, title: titles[5], status: 'open', detail, messages: [] }
  } else {
    const pflicht = selection.violations.filter((v) => PFLICHT_CODES.includes(v.code)).map((v) => v.message)
    c3 = {
      id: 3,
      title: titles[3],
      status: pflicht.length === 0 ? 'ok' : 'fail',
      detail:
        pflicht.length === 0
          ? `${selection.pflichtCount} Pflichtkurse, alle mit mindestens 1 Punkt.`
          : 'Nicht erfüllt.',
      messages: pflicht,
    }
    const deficit = selection.violations.filter((v) => DEFICIT_CODES.includes(v.code)).map((v) => v.message)
    c4 = {
      id: 4,
      title: titles[4],
      status: deficit.length === 0 ? 'ok' : 'fail',
      detail:
        `${selection.deficits} ${selection.deficits === 1 ? 'Defizit' : 'Defizite'} bei ${selection.count} eingebrachten Kursen ` +
        `(max. ${selection.maxDeficits}), davon ${selection.lkDeficits} im LK (max. ${MAX_LK_DEFICITS}).`,
      messages: deficit,
    }
    c5 = {
      id: 5,
      title: titles[5],
      status: selection.blockI >= MIN_BLOCK_I ? 'ok' : 'fail',
      detail: `Block I = ${selection.blockI} Punkte.`,
      messages: selection.blockI >= MIN_BLOCK_I ? [] : [`Es fehlen ${MIN_BLOCK_I - selection.blockI} Punkte.`],
    }
  }

  const criteria = [c1, c2, c3, c4, c5]
  const required = [c1, c3, c4, c5]
  let status: AdmissionStatus
  if (required.some((c) => c.status === 'fail')) status = 'not-admitted'
  else if (required.some((c) => c.status === 'open')) status = 'open'
  else if (c2.status !== 'ok') status = 'admitted-pending-hours'
  else status = 'admitted'

  return { status, criteria, taken }
}
