import type { OptimizerResult, Selection } from '../../logic/optimizer'
import { formatDecimal2 } from '../../logic/points'
import { cx } from '../ui'

function shortReason(selection: Selection): string {
  const codes = new Set(selection.violations.map((v) => v.code))
  if (codes.has('missing') || codes.has('zero')) return 'Pflicht nicht erfüllt'
  if (codes.has('too-many-pflicht')) return 'mehr Pflichtkurse'
  if (codes.has('not-enough')) return 'zu wenige Kurse'
  if (codes.has('lk-deficits')) return 'zu viele LK-Defizite'
  if (codes.has('deficits')) return 'zu viele Defizite'
  return 'unzulässig'
}

export function CountTable({ optimizer }: { optimizer: OptimizerResult }) {
  const best = optimizer.best
  return (
    <div className="table-wrap">
      <table className="table table--compact">
        <thead>
          <tr>
            <th scope="col">Kurse</th>
            <th scope="col">Block I</th>
            <th scope="col">Schnitt</th>
            <th scope="col">Defizite</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {optimizer.perCount.map(({ count, selection }) => {
            const isBest = best !== null && selection === best
            return (
              <tr key={count} className={cx(isBest && 'table__best', !selection.feasible && 'table__muted')}>
                <th scope="row">{count}</th>
                <td>{selection.blockI}</td>
                <td>{formatDecimal2(selection.P / selection.S)}</td>
                <td>
                  {selection.deficits}/{selection.maxDeficits}
                  {selection.lkDeficits > 0 && <span className="muted"> (LK {selection.lkDeficits})</span>}
                </td>
                <td>{isBest ? '★ beste Wahl' : selection.feasible ? '✔ zulässig' : `✘ ${shortReason(selection)}`}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
