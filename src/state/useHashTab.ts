/** Aktiver Tab im URL-Hash (#kurse …) – so funktioniert die Zurück-Taste am Handy. */
import { useCallback, useEffect, useState } from 'react'

export const TABS = [
  { id: 'kurse', label: 'Kurse & Noten', short: 'Kurse & Noten' },
  { id: 'zulassung', label: 'Zulassung (Block I)', short: 'Zulassung' },
  { id: 'abitur', label: 'Abitur (Block II)', short: 'Abitur' },
  { id: 'ergebnis', label: 'Ergebnis & Ziel', short: 'Ergebnis' },
] as const

export type TabId = (typeof TABS)[number]['id']

function readHash(): TabId {
  const hash = window.location.hash.replace('#', '')
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : 'kurse'
}

export function useHashTab(): [TabId, (tab: TabId) => void] {
  const [tab, setTab] = useState<TabId>(readHash)

  useEffect(() => {
    const onHashChange = () => setTab(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: TabId) => {
    if (window.location.hash !== `#${next}`) window.location.hash = next
    setTab(next)
    window.scrollTo({ top: 0 })
  }, [])

  return [tab, navigate]
}
