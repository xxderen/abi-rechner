import type { Dispatch } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { Computed } from '../../logic/compute'
import { GRADE_OPTIONS, gradeChange } from '../../logic/grade'
import { formatDecimal1 } from '../../logic/points'
import {
  balancedBlockITarget,
  blockITargetForGrade,
  examTargetForGrade,
  requiredAverageForBlockI,
} from '../../logic/targets'
import type { AppState } from '../../logic/types'
import type { Action } from '../../state/reducer'
import { Card, cx } from '../ui'

interface Props {
  state: AppState
  dispatch: Dispatch<Action>
  computed: Computed
}

export function ResultTab({ state, dispatch, computed }: Props) {
  const { overall } = computed
  const change = overall.status === 'passed' && overall.total !== null ? gradeChange(overall.total) : null

  return (
    <div className="stack">
      <Card title="Gesamtqualifikation">
        <div className="result-hero">
          <div className="result-hero__sum">
            <span className="result-hero__part">
              <small>Block I</small>
              {overall.blockI ?? '–'}
            </span>
            <span className="result-hero__op">+</span>
            <span className="result-hero__part">
              <small>Block II</small>
              {overall.blockII ?? '–'}
            </span>
            <span className="result-hero__op">=</span>
            <span className="result-hero__part">
              <small>Gesamt</small>
              {overall.total ?? '–'}
            </span>
          </div>
          <div className={cx('grade-badge', overall.status === 'failed' && 'grade-badge--fail')}>
            <small>Abiturnote</small>
            <span>{overall.grade ?? (overall.status === 'failed' ? '✘' : '–')}</span>
          </div>
        </div>
        {overall.status === 'passed' && <p className="muted">Gesamtpunktzahl 300–900, Note laut Tabelle der Schule.</p>}
        {overall.reasons.length > 0 && (
          <ul className={cx('reasons', overall.status === 'failed' && 'reasons--fail')}>
            {overall.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </Card>

      {change && (
        <Card title="Änderung der Durchschnittsnote" className="change-box">
          <div className="change-grid">
            <div className="change-grid__item change-grid__item--up">
              <span className="change-grid__label">Nächstbessere Note</span>
              {change.better ? (
                <>
                  <strong>{change.better.band.grade}</strong>
                  <span>
                    ab {change.better.band.min} Punkten – dir fehlen <strong>{change.better.missing}</strong>{' '}
                    {change.better.missing === 1 ? 'Punkt' : 'Punkte'}
                  </span>
                </>
              ) : (
                <span>Besser als 1,0 geht nicht.</span>
              )}
            </div>
            <div className="change-grid__item change-grid__item--down">
              <span className="change-grid__label">Schlechtere Note</span>
              {change.worse.band ? (
                <>
                  <strong>{change.worse.band.grade}</strong>
                  <span>
                    ab {change.worse.threshold - 1} Punkten – Puffer: <strong>{change.worse.buffer}</strong>{' '}
                    {change.worse.buffer === 1 ? 'Punkt' : 'Punkte'}
                  </span>
                </>
              ) : (
                <span>Unter 300 Punkten wäre das Abitur nicht bestanden.</span>
              )}
            </div>
          </div>
        </Card>
      )}

      <GradeTarget state={state} dispatch={dispatch} computed={computed} />
      <RemainingTarget state={state} dispatch={dispatch} computed={computed} />
    </div>
  )
}

function GradeTarget({ state, dispatch, computed }: Props) {
  const grade = state.goals.targetGrade
  const blockI = computed.overall.blockI
  const blockII = computed.blockII.evaluation?.sum ?? null
  const examTarget = blockI !== null ? examTargetForGrade(grade, blockI) : null
  const neededBlockI = blockII !== null ? blockITargetForGrade(grade, blockII) : null

  return (
    <Card title="Zielnote" subtitle="Was brauchst du für deine Wunschnote?">
      <label className="field field--inline">
        <span className="field__label">Zielnote</span>
        <select value={grade} onChange={(e) => dispatch({ type: 'setGoals', patch: { targetGrade: e.currentTarget.value } })}>
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      {examTarget && (
        <dl className="facts">
          <div>
            <dt>Nötige Gesamtpunkte</dt>
            <dd>{examTarget.neededTotal}</dd>
          </div>
          <div>
            <dt>Nötig in Block II (bei Block I = {blockI})</dt>
            <dd className={cx(!examTarget.reachable && 'facts__fail')}>
              {examTarget.reachable ? `${examTarget.neededBlockII} Punkte` : `${examTarget.neededBlockII} – nicht erreichbar (max. 300)`}
            </dd>
          </div>
          {examTarget.reachable && (
            <div>
              <dt>Nötiger Schnitt pro Prüfungsfach</dt>
              <dd>
                {formatDecimal1(Math.ceil(examTarget.perExamAverage * 10 - 1e-9) / 10)} Punkte
                <span className="muted"> (zusammen mind. {examTarget.examPointSum} von 60 Punkten)</span>
              </dd>
            </div>
          )}
        </dl>
      )}
      {examTarget && blockI !== null && examTarget.neededTotal - blockI < 100 && (
        <p className="muted small">Block II muss in jedem Fall mindestens 100 Punkte haben, sonst ist das Abitur nicht bestanden.</p>
      )}
      {!examTarget && (
        <p className="muted">
          Nötige Gesamtpunkte: <strong>{GRADE_OPTIONS.includes(grade) ? examTargetForGrade(grade, 0)?.neededTotal : '–'}</strong>.
          Sobald Block I berechnet ist, siehst du hier, was du in den Prüfungen brauchst.
        </p>
      )}
      {neededBlockI && (
        <p className="muted">
          Mit deinem Block II ({blockII}) bräuchtest du Block I ≥ {neededBlockI.neededBlockI}
          {neededBlockI.reachable ? '.' : ' – das ist nicht erreichbar (max. 600).'}
        </p>
      )}
    </Card>
  )
}

function RemainingTarget({ state, dispatch, computed }: Props) {
  const stored = state.goals.blockITarget
  const suggestion = balancedBlockITarget(state.goals.targetGrade)
  const blockII = computed.blockII.evaluation?.sum ?? null
  const fromBlockII = blockII !== null ? blockITargetForGrade(state.goals.targetGrade, blockII) : null
  const target = stored ?? suggestion ?? 400
  const [draft, setDraft] = useState(String(target))

  useEffect(() => setDraft(String(target)), [target])

  const result = useMemo(() => requiredAverageForBlockI(state, target), [state, target])

  const commit = (raw: string) => {
    setDraft(raw)
    const value = Number(raw)
    if (/^\d{3}$/.test(raw) && value >= 200 && value <= 600) dispatch({ type: 'setGoals', patch: { blockITarget: value } })
  }

  return (
    <Card
      title="Nötiger Schnitt in den restlichen Kursen"
      subtitle="Welchen Schnitt brauchst du in allen Kursen ohne Zeugnisnote (Prognose-Halbjahre und leere Felder), damit Block I dein Ziel erreicht?"
    >
      <label className="field field--inline">
        <span className="field__label">Block-I-Ziel (200–600)</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={3}
          className="input-number"
          value={draft}
          aria-invalid={!/^\d{3}$/.test(draft) || Number(draft) < 200 || Number(draft) > 600}
          onChange={(e) => commit(e.currentTarget.value.replace(/\D/g, ''))}
          onBlur={() => setDraft(String(target))}
        />
      </label>
      <div className="row-actions row-actions--start">
        {suggestion !== null && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => dispatch({ type: 'setGoals', patch: { blockITarget: suggestion } })}
          >
            {suggestion} übernehmen (Zielnote {state.goals.targetGrade}, Prüfungen so stark wie Kurse)
          </button>
        )}
        {fromBlockII && fromBlockII.reachable && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => dispatch({ type: 'setGoals', patch: { blockITarget: fromBlockII.neededBlockI } })}
          >
            {fromBlockII.neededBlockI} übernehmen (Zielnote {state.goals.targetGrade} bei deinem Block II)
          </button>
        )}
      </div>

      <div className="remaining-result" role="status">
        {result.status === 'no-remaining' && <p>Alle Noten stehen fest – es gibt keine offenen Kurse mehr.</p>}
        {result.status === 'reachable' && (
          <p>
            In den restlichen <strong>{result.remainingCount}</strong> Kursen brauchst du im Schnitt mindestens{' '}
            <strong className="big-number">{formatDecimal1(result.requiredAverage!)}</strong> Punkte
            {result.blockIAtRequired !== null && <> (ergibt Block I = {result.blockIAtRequired})</>}.
          </p>
        )}
        {result.status === 'already-safe' && (
          <p>Dein Ziel ist schon sicher – selbst mit sehr schwachen restlichen Kursen erreichst du Block I ≥ {target}.</p>
        )}
        {result.status === 'unreachable' && (
          <p className="facts__fail">
            Nicht mehr erreichbar
            {result.maxBlockI !== null
              ? ` – selbst mit 15 Punkten in allen restlichen Kursen sind höchstens ${result.maxBlockI} möglich.`
              : ' – auch mit 15 Punkten in allen restlichen Kursen gibt es keine zulässige Einbringung.'}
          </p>
        )}
        <p className="muted small">
          Annahme: alle restlichen Kurse gleich gut. Gerechnet wird mit dem kompletten Optimierer, also mit Pflichtkursen,
          Defizitgrenzen und der 0-Punkte-Regel.
        </p>
      </div>
    </Card>
  )
}
