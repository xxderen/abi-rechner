import type { Computed } from '../logic/compute'
import type { TabId } from '../state/useHashTab'
import { TABS } from '../state/useHashTab'
import { cx } from './ui'

function SummaryItem(props: { label: string; value: string; tone: 'ok' | 'fail' | 'open' | 'neutral'; onClick: () => void }) {
  return (
    <button type="button" className={cx('summary__item', `summary__item--${props.tone}`)} onClick={props.onClick}>
      <span className="summary__label">{props.label}</span>
      <span className="summary__value">{props.value}</span>
    </button>
  )
}

/** Tabs + Statuszeile, klebt beim Scrollen oben */
export function TopBar(props: { tab: TabId; onNavigate: (tab: TabId) => void; computed: Computed }) {
  const { tab, onNavigate, computed } = props
  const { optimizer, admission, blockII, overall } = computed

  const blockI = optimizer.display?.blockI ?? null
  const blockITone =
    admission.status === 'not-admitted' ? 'fail' : admission.status === 'open' || blockI === null ? 'open' : 'ok'
  const blockIITone = !blockII.evaluation ? 'open' : blockII.evaluation.passed ? 'ok' : 'fail'
  const totalTone = overall.status === 'passed' ? 'ok' : overall.status === 'failed' ? 'fail' : 'open'

  return (
    <div className="topbar">
      <nav className="tabs" aria-label="Bereiche">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className={cx('tab', tab === t.id && 'tab--active')}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault()
              onNavigate(t.id)
            }}
          >
            <span className="tab__long">{t.label}</span>
            <span className="tab__short">{t.short}</span>
          </a>
        ))}
      </nav>
      <div className="summary" aria-label="Zusammenfassung">
        <SummaryItem
          label="Block I"
          value={blockI === null ? '–' : String(blockI)}
          tone={blockITone}
          onClick={() => onNavigate('zulassung')}
        />
        <SummaryItem
          label="Block II"
          value={blockII.evaluation ? String(blockII.evaluation.sum) : '–'}
          tone={blockIITone}
          onClick={() => onNavigate('abitur')}
        />
        <SummaryItem
          label="Gesamt"
          value={overall.total === null ? '–' : String(overall.total)}
          tone={overall.total === null ? 'open' : 'neutral'}
          onClick={() => onNavigate('ergebnis')}
        />
        <SummaryItem
          label="Note"
          value={overall.grade ?? (overall.status === 'failed' ? '✘' : '–')}
          tone={totalTone}
          onClick={() => onNavigate('ergebnis')}
        />
      </div>
    </div>
  )
}
