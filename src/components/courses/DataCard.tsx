import type { ChangeEvent, Dispatch } from 'react'
import { useRef, useState } from 'react'
import type { AppState } from '../../logic/types'
import { createExport, exportFileName, parseImport } from '../../logic/serialization'
import type { Action } from '../../state/reducer'
import { Card, Sheet } from '../ui'
import { FillForecastSheet } from './FillForecastSheet'

interface Props {
  state: AppState
  dispatch: Dispatch<Action>
  storageOk: boolean
}

type Dialog = { kind: 'fill' } | { kind: 'reset' } | { kind: 'import'; imported: AppState } | null

export function DataCard({ state, dispatch, storageOk }: Props) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(createExport(state), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exportFileName()
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage({ tone: 'ok', text: 'Export gespeichert. Die Datei enthält deine Fächer und Noten.' })
  }

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const result = parseImport(await file.text())
    if (result.ok) setDialog({ kind: 'import', imported: result.state })
    else setMessage({ tone: 'error', text: `Import fehlgeschlagen: ${result.error}` })
  }

  return (
    <Card
      title="Daten"
      subtitle="Deine Noten werden nur in diesem Browser gespeichert. Mit Export und Import überträgst du sie auf ein anderes Gerät."
    >
      {!storageOk && (
        <p className="note note--warn">
          Dein Browser erlaubt gerade kein Speichern (z. B. privater Modus). Nutze den Export, sonst sind die Eingaben beim
          Schließen weg.
        </p>
      )}
      <div className="row-actions row-actions--start">
        <button type="button" className="btn btn--ghost" onClick={() => setDialog({ kind: 'fill' })}>
          Leere Prognosefelder füllen…
        </button>
        <button type="button" className="btn btn--ghost" onClick={exportJson}>
          Exportieren (JSON)
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => fileInput.current?.click()}>
          Importieren…
        </button>
        <button type="button" className="btn btn--danger-ghost" onClick={() => setDialog({ kind: 'reset' })}>
          Alles zurücksetzen…
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFile} />
      </div>
      {message && (
        <p className={message.tone === 'ok' ? 'note note--ok' : 'note note--error'} role="status">
          {message.text}
        </p>
      )}

      {dialog?.kind === 'fill' && (
        <FillForecastSheet
          state={state}
          onClose={() => setDialog(null)}
          onFill={(strategy) => {
            dispatch({ type: 'fillForecasts', strategy })
            setDialog(null)
          }}
        />
      )}

      {dialog?.kind === 'reset' && (
        <Sheet
          title="Alles zurücksetzen?"
          onClose={() => setDialog(null)}
          footer={
            <button type="button" className="btn btn--ghost" onClick={() => setDialog(null)}>
              Abbrechen
            </button>
          }
        >
          <p>Alle Noten, Prognosen, Prüfungsergebnisse und Einstellungen in diesem Browser werden gelöscht.</p>
          <div className="stack stack--tight">
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                dispatch({ type: 'reset', mode: 'template' })
                setDialog(null)
                setMessage({ tone: 'ok', text: 'Zurückgesetzt auf die Vorlage (ohne Noten).' })
              }}
            >
              Auf Vorlage zurücksetzen (M-LK, CH-LK, D, SW …)
            </button>
            <button
              type="button"
              className="btn btn--danger-ghost"
              onClick={() => {
                dispatch({ type: 'reset', mode: 'empty' })
                setDialog(null)
                setMessage({ tone: 'ok', text: 'Alles gelöscht – füge jetzt deine Fächer hinzu.' })
              }}
            >
              Mit leerer Fächerliste neu starten
            </button>
          </div>
        </Sheet>
      )}

      {dialog?.kind === 'import' && (
        <Sheet
          title="Daten importieren?"
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setDialog(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  dispatch({ type: 'replace', state: dialog.imported })
                  setDialog(null)
                  setMessage({ tone: 'ok', text: 'Import erfolgreich.' })
                }}
              >
                Importieren
              </button>
            </>
          }
        >
          <p>
            Die Datei enthält {dialog.imported.subjects.length} Fächer. Deine aktuellen Eingaben in diesem Browser werden
            dabei ersetzt.
          </p>
        </Sheet>
      )}
    </Card>
  )
}
