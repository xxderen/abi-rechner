import type { Dispatch } from 'react'
import type { Computed } from '../../logic/compute'
import { examPoints, oralExamResult } from '../../logic/blockII'
import type { AbiFach, AppState, Subject } from '../../logic/types'
import type { Action } from '../../state/reducer'
import { Card, cx, PointsInput, StatusIcon } from '../ui'
import { OralTable } from './OralTable'

interface Props {
  state: AppState
  dispatch: Dispatch<Action>
  computed: Computed
}

const FACH_INFO: Record<AbiFach, string> = {
  1: '1. Fach · LK · schriftlich',
  2: '2. Fach · LK · schriftlich',
  3: '3. Fach · GK · schriftlich',
  4: '4. Fach · GK · mündlich',
}

export function ExamsTab({ state, dispatch, computed }: Props) {
  const { exams } = state
  const { blockII } = computed
  const abi = (k: AbiFach): Subject | undefined => state.subjects.find((s) => s.abiFach === k)
  const missingAbi = ([1, 2, 3, 4] as const).filter((k) => !abi(k))

  return (
    <div className="stack">
      {missingAbi.length > 0 && (
        <p className="note note--warn">
          Abifach {missingAbi.join(', ')} ist noch nicht festgelegt – das geht unter „Kurse & Noten“ (Fach antippen).
        </p>
      )}
      {computed.hasBll && (
        <p className="note note--warn">
          Du hast einen Projektkurs als besondere Lernleistung (5. Abifach) markiert. Wie die BLL in Block II gewertet wird,
          bildet dieser Rechner nicht ab – Block II wird hier nur aus den 4 Prüfungen berechnet. Maßgeblich ist die Schule.
        </p>
      )}

      <Card title="Abiturprüfungen" subtitle="Prüfungsergebnis jeweils 0–15 Punkte, es zählt 5-fach. Trage erwartete oder echte Ergebnisse ein.">
        <div className="exam-grid">
          {([1, 2, 3] as const).map((k) => {
            const i = (k - 1) as 0 | 1 | 2
            const written = exams.written[i]
            const oral = exams.oral[i]
            const subject = abi(k)
            return (
              <div key={k} className="exam-card">
                <div className="exam-card__head">
                  <span className="exam-card__info">{FACH_INFO[k]}</span>
                  <strong>{subject?.name ?? 'nicht festgelegt'}</strong>
                </div>
                <div className="exam-card__inputs">
                  <label className="field field--inline">
                    <span className="field__label">Schriftlich</span>
                    <PointsInput
                      value={written}
                      label={`${k}. Fach schriftlich`}
                      onChange={(points) => dispatch({ type: 'setExam', kind: 'written', index: i, points })}
                    />
                  </label>
                  <label className="field field--inline">
                    <span className="field__label">Mündl. Nachprüfung</span>
                    <PointsInput
                      value={oral}
                      label={`${k}. Fach mündliche Nachprüfung`}
                      onChange={(points) => dispatch({ type: 'setExam', kind: 'oral', index: i, points })}
                    />
                  </label>
                </div>
                <p className="exam-card__result">
                  {written === null ? (
                    <span className="muted">Ergebnis: –</span>
                  ) : oral === null ? (
                    <>
                      {written} × 5 = <strong>{examPoints(written)}</strong> Punkte
                    </>
                  ) : (
                    <>
                      (2 · {written} + {oral}) / 3 × 5 = <strong>{oralExamResult(written, oral)}</strong> Punkte
                      <span className="muted"> (ohne Nachprüfung {examPoints(written)})</span>
                    </>
                  )}
                </p>
              </div>
            )
          })}
          <div className="exam-card">
            <div className="exam-card__head">
              <span className="exam-card__info">{FACH_INFO[4]}</span>
              <strong>{abi(4)?.name ?? 'nicht festgelegt'}</strong>
            </div>
            <div className="exam-card__inputs">
              <label className="field field--inline">
                <span className="field__label">Mündlich</span>
                <PointsInput
                  value={exams.fourth}
                  label="4. Fach mündlich"
                  onChange={(points) => dispatch({ type: 'setFourthExam', points })}
                />
              </label>
            </div>
            <p className="exam-card__result">
              {exams.fourth === null ? (
                <span className="muted">Ergebnis: –</span>
              ) : (
                <>
                  {exams.fourth} × 5 = <strong>{examPoints(exams.fourth)}</strong> Punkte
                </>
              )}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Block II">
        <div className="score">
          <span className={cx('score__value', blockII.evaluation && !blockII.evaluation.passed && 'score__value--fail')}>
            {blockII.evaluation ? blockII.evaluation.sum : '–'}
          </span>
          <span className="score__max">/ 300 (mind. 100)</span>
        </div>
        {blockII.evaluation ? (
          <>
            <ul className="criteria criteria--compact">
              <li className="criteria__item">
                <StatusIcon status={blockII.evaluation.conditions.twoSubjects25 ? 'ok' : 'fail'} />
                <span>Mindestens 2 Prüfungsfächer mit jeweils ≥ 25 Punkten</span>
              </li>
              <li className="criteria__item">
                <StatusIcon status={blockII.evaluation.conditions.lk25 ? 'ok' : 'fail'} />
                <span>Darunter mindestens ein LK mit ≥ 25 Punkten</span>
              </li>
              <li className="criteria__item">
                <StatusIcon status={blockII.evaluation.conditions.sum100 ? 'ok' : 'fail'} />
                <span>Summe mindestens 100 Punkte</span>
              </li>
            </ul>
            <ExamStatus computed={computed} oralEntered={exams.oral.some((o) => o !== null)} />
          </>
        ) : (
          <p className="muted">Trage alle vier Prüfungsergebnisse ein, um Block II zu berechnen.</p>
        )}
      </Card>

      <Card
        title="Mündlich – Was bringt’s?"
        subtitle="Neues Fachergebnis bei einer mündlichen Nachprüfung im 1.–3. Fach: (2 × schriftlich + mündlich) / 3 × 5, gerundet erst zum Schluss."
      >
        <p className="note note--warn">
          Achtung: Eine freiwillige Nachprüfung kann die Note auch verschlechtern (rote Werte).
        </p>
        <OralTable exams={exams} subjects={state.subjects} />
      </Card>
    </div>
  )
}

function ExamStatus({ computed, oralEntered }: { computed: Computed; oralEntered: boolean }) {
  const { blockII } = computed
  if (!blockII.evaluation || !blockII.writtenOnly) return null

  if (blockII.oralNeed === 'voluntary') {
    return (
      <div className={cx('banner', blockII.evaluation.passed ? 'banner--ok' : 'banner--fail')}>
        <strong className="banner__title">{blockII.evaluation.passed ? 'Bestanden ✔' : 'Nicht bestanden ✘'}</strong>
        <span>
          {blockII.evaluation.passed
            ? 'Schon ohne Nachprüfung bestanden – eine mündliche Nachprüfung ist freiwillig.'
            : 'Ohne Nachprüfung wäre Block II bestanden – die eingetragene Nachprüfung verschlechtert das Ergebnis.'}
        </span>
      </div>
    )
  }
  if (blockII.oralNeed === 'mandatory') {
    const hints = blockII.minOralToPass
      .map((m, i) => (m === null ? null : `${i + 1}. Fach: mindestens ${m} Punkte mündlich`))
      .filter((h): h is string => h !== null)
    return (
      <div className={cx('banner', blockII.evaluation.passed ? 'banner--ok' : 'banner--warn')}>
        <strong className="banner__title">
          {blockII.evaluation.passed ? 'Mit Nachprüfung bestanden ✔' : 'Mündliche Nachprüfung ist Pflicht'}
        </strong>
        <span>
          Ohne Nachprüfung ist Block II nicht bestanden, mit Nachprüfung ist Bestehen noch möglich.
          {hints.length > 0
            ? ` Es reicht eine Nachprüfung allein – ${hints.join('; ')}.`
            : ' Dafür sind Nachprüfungen in mehreren Fächern nötig.'}
          {oralEntered && !blockII.evaluation.passed && ' Mit den eingetragenen Nachprüfungen reicht es noch nicht.'}
        </span>
      </div>
    )
  }
  return (
    <div className="banner banner--fail">
      <strong className="banner__title">Nicht bestanden ✘</strong>
      <span>{blockII.writtenOnly.messages.join(' ')} Auch mit mündlichen Nachprüfungen ist Bestehen nicht mehr möglich.</span>
    </div>
  )
}
