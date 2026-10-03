import { examPoints, oralTable } from '../../logic/blockII'
import type { Exams, Subject } from '../../logic/types'
import { cx } from '../ui'

export function OralTable({ exams, subjects }: { exams: Exams; subjects: Subject[] }) {
  const columns = ([0, 1, 2] as const)
    .map((i) => ({ i, written: exams.written[i], subject: subjects.find((s) => s.abiFach === i + 1) }))
    .filter((c): c is { i: 0 | 1 | 2; written: number; subject: Subject | undefined } => c.written !== null)

  if (columns.length === 0) {
    return <p className="muted">Trage oben ein schriftliches Ergebnis ein, dann erscheint hier die Tabelle.</p>
  }

  const tables = columns.map((c) => oralTable(c.written))

  return (
    <div className="table-wrap">
      <table className="table oral-table">
        <thead>
          <tr>
            <th scope="col">Mündlich</th>
            {columns.map((c) => (
              <th key={c.i} scope="col">
                {c.i + 1}. Fach{c.subject ? ` (${c.subject.short})` : ''}
                <span className="oral-table__base">
                  schriftl. {c.written} → {examPoints(c.written)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 16 }, (_, oral) => (
            <tr key={oral}>
              <th scope="row">{oral}</th>
              {columns.map((c, col) => {
                const row = tables[col][oral]
                const tone = row.diff > 0 ? 'up' : row.diff < 0 ? 'down' : 'same'
                return (
                  <td key={c.i} className={cx('oral-cell', `oral-cell--${tone}`, exams.oral[c.i] === oral && 'oral-cell--chosen')}>
                    {row.result}
                    <span className="oral-cell__diff">{row.diff > 0 ? `+${row.diff}` : row.diff === 0 ? '±0' : row.diff}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
