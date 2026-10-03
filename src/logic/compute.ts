/** Alle Ergebnisse auf einmal – die UI ruft nur diese Funktion auf. */
import type { AdmissionResult } from './admission'
import { evaluateAdmission } from './admission'
import type { BlockIIStatus } from './blockII'
import { blockIIStatus } from './blockII'
import type { Course } from './courses'
import { deriveCourses, projectModeOf } from './courses'
import { gradeForTotal } from './grade'
import type { OptimizerResult } from './optimizer'
import { optimizeCourses } from './optimizer'
import type { Variant } from './requirements'
import { buildVariants } from './requirements'
import type { AppState } from './types'
import type { ConfigIssue } from './validation'
import { validateConfig } from './validation'

export type OverallStatus = 'open' | 'passed' | 'failed'

export interface Overall {
  status: OverallStatus
  blockI: number | null
  blockII: number | null
  total: number | null
  grade: string | null
  reasons: string[]
}

export interface Computed {
  courses: Course[]
  variants: Variant[]
  optimizer: OptimizerResult
  admission: AdmissionResult
  blockII: BlockIIStatus
  overall: Overall
  issues: ConfigIssue[]
  /** mindestens ein Projektkurs ist als besondere Lernleistung markiert */
  hasBll: boolean
}

export function computeAll(state: AppState): Computed {
  const courses = deriveCourses(state)
  const variants = buildVariants(state)
  const optimizer = optimizeCourses(courses, variants)
  const admission = evaluateAdmission(state.settings, courses, optimizer)
  const blockII = blockIIStatus(state.exams)

  const blockI = optimizer.best?.blockI ?? null
  const blockIISum = blockII.evaluation?.sum ?? null
  const reasons: string[] = []
  let status: OverallStatus = 'open'
  if (admission.status === 'not-admitted') {
    status = 'failed'
    reasons.push('Die Zulassungsvoraussetzungen (Block I) sind nicht erfüllt.')
  } else if (blockII.evaluation && !blockII.evaluation.passed) {
    status = 'failed'
    reasons.push('Die Bedingungen für Block II sind nicht erfüllt.')
  } else if (admission.status === 'open' || !blockII.complete || blockI === null) {
    status = 'open'
    if (admission.status === 'open') reasons.push('Block I ist noch offen (fehlende Noten oder Prognosen).')
    if (!blockII.complete) reasons.push('Block II ist noch offen (Prüfungsergebnisse fehlen).')
  } else {
    status = 'passed'
    if (admission.status === 'admitted-pending-hours') {
      reasons.push('Zulassung unter Vorbehalt: Bitte die durchschnittliche Wochenstundenzahl 34 bestätigen (Tab „Zulassung“).')
    }
  }

  const total = blockI !== null && blockIISum !== null ? blockI + blockIISum : null
  return {
    courses,
    variants,
    optimizer,
    admission,
    blockII,
    overall: {
      status,
      blockI,
      blockII: blockIISum,
      total,
      grade: status === 'passed' && total !== null ? gradeForTotal(total) : null,
      reasons,
    },
    issues: validateConfig(state),
    hasBll: state.subjects.some((s) => s.type === 'PK' && projectModeOf(s) === 'bll'),
  }
}
