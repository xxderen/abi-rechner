import { useState } from 'react'
import type { Course } from '../../logic/courses'
import { courseId, courseLabel } from '../../logic/courses'
import type { Selection } from '../../logic/optimizer'
import { formatPoints, isDeficit, pointsToGrade } from '../../logic/points'
import type { AppState } from '../../logic/types'
import { SEMESTERS, SEMESTER_LABELS } from '../../logic/types'
import { cx } from '../ui'

interface Props {
  state: AppState
  courses: Course[]
  selection: Selection
}

function describe(course: Course, selection: Selection): string {
  const role = selection.roles.get(course.id)
  const head = `${courseLabel(course)}: ${course.points === null ? 'keine Note' : `${course.points} Punkte (${pointsToGrade(course.points)})`}${course.isForecast ? ', Prognose' : ''}`
  if (role === 'pflicht') return `${head} – Pflicht: ${(selection.reasons.get(course.id) ?? []).join(' · ')}`
  if (role === 'zusatz') return `${head} – zusätzlich eingebracht (frei gewählt)`
  if (course.type === 'VTF') return `${head} – Vertiefungskurs, wird nie eingebracht`
  if (!course.includable) return `${head} – Projektkurs wird laut Einstellung nicht in Block I eingebracht`
  if (course.points === 0) return `${head} – Kurse mit 0 Punkten können nicht eingebracht werden`
  return `${head} – nicht eingebracht (würde den Schnitt senken oder ist nicht nötig)`
}

export function SelectionGrid({ state, courses, selection }: Props) {
  const [active, setActive] = useState<string | null>(null)
  const byId = new Map(courses.map((c) => [c.id, c]))
  const activeCourse = active ? byId.get(active) : undefined
  const subjects = state.subjects.filter((s) => s.taken.some(Boolean))

  return (
    <>
      <div className="legend" aria-hidden="true">
        <span className="legend__item">
          <span className="sel sel--pflicht legend__swatch" /> Pflicht
        </span>
        <span className="legend__item">
          <span className="sel sel--zusatz legend__swatch" /> zusätzlich
        </span>
        <span className="legend__item">
          <span className="sel sel--none legend__swatch" /> nicht eingebracht
        </span>
        <span className="legend__item">
          <span className="sel sel--none sel--deficit legend__swatch" /> Defizit
        </span>
        <span className="legend__item">
          <span className="sel sel--none sel--forecast legend__swatch">P</span> Prognose
        </span>
      </div>

      <div className="sel-grid" role="table" aria-label="Eingebrachte Kurse">
        <div className="sel-grid__row sel-grid__head" role="row">
          <span role="columnheader">Fach</span>
          {SEMESTERS.map((sem) => (
            <span key={sem} role="columnheader">
              {SEMESTER_LABELS[sem]}
            </span>
          ))}
        </div>
        {subjects.map((subject) => (
          <div key={subject.id} className="sel-grid__row" role="row">
            <span className="sel-grid__subject" role="rowheader" title={subject.name}>
              <strong>{subject.short}</strong>
              {subject.level === 'LK' && subject.type !== 'PK' && subject.type !== 'VTF' && <span className="badge badge--lk">LK</span>}
              <span className="sel-grid__name">{subject.name}</span>
            </span>
            {SEMESTERS.map((sem) => {
              const course = subject.taken[sem] ? byId.get(courseId(subject.id, sem)) : undefined
              if (!course) {
                return (
                  <span key={sem} role="cell" className="sel-grid__cell">
                    <span className="sel sel--empty" title="nicht belegt">
                      –
                    </span>
                  </span>
                )
              }
              const role = selection.roles.get(course.id)
              const text = describe(course, selection)
              return (
                <span key={sem} role="cell" className="sel-grid__cell">
                  <button
                    type="button"
                    className={cx(
                      'sel',
                      role === 'pflicht' ? 'sel--pflicht' : role === 'zusatz' ? 'sel--zusatz' : 'sel--none',
                      course.points !== null && isDeficit(course.points) && 'sel--deficit',
                      course.isForecast && 'sel--forecast',
                      active === course.id && 'sel--active',
                    )}
                    aria-label={text}
                    aria-pressed={active === course.id}
                    title={text}
                    onClick={() => setActive(active === course.id ? null : course.id)}
                  >
                    {course.points === null ? '··' : formatPoints(course.points)}
                  </button>
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <p className="sel-info" aria-live="polite">
        {activeCourse ? describe(activeCourse, selection) : 'Tippe auf einen Kurs für Details.'}
      </p>
    </>
  )
}
