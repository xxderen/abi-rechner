import { CATALOG, createSubject } from '../../logic/catalog'
import type { Subject } from '../../logic/types'
import { Sheet } from '../ui'

interface Props {
  subjects: Subject[]
  onAdd: (subject: Subject) => void
  onClose: () => void
}

export function AddSubjectSheet({ subjects, onAdd, onClose }: Props) {
  const existing = new Set(subjects.map((s) => s.name.trim().toLowerCase()))

  return (
    <Sheet title="Fach hinzufügen" onClose={onClose}>
      <p className="muted">
        Wähle ein Fach aus der Liste oder lege ein eigenes an. Danach kannst du Kursart, Abifach und Halbjahre einstellen.
      </p>
      <div className="catalog">
        {CATALOG.map((entry) => {
          const present = existing.has(entry.name.toLowerCase())
          return (
            <button
              key={entry.key}
              type="button"
              className="catalog__item"
              disabled={present}
              onClick={() => onAdd(createSubject({ name: entry.name, short: entry.short, type: entry.type }))}
            >
              <span className="catalog__short">{entry.short}</span>
              <span className="catalog__name">{entry.name}</span>
              {present && <span className="catalog__present">✓ vorhanden</span>}
            </button>
          )
        })}
      </div>
      <div className="row-actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => onAdd(createSubject({ name: 'Neues Fach', short: 'NEU', type: 'SONST' }))}
        >
          + Eigenes Fach anlegen
        </button>
      </div>
    </Sheet>
  )
}
