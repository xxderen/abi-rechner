/** App-Zustand mit Speicherung im localStorage (nur in diesem Browser) */
import { useEffect, useReducer, useState } from 'react'
import { parseStoredState, STORAGE_KEY } from '../logic/serialization'
import { createTemplateState } from '../logic/template'
import type { AppState } from '../logic/types'
import { reducer } from './reducer'

function loadInitialState(): AppState {
  try {
    return parseStoredState(window.localStorage.getItem(STORAGE_KEY)) ?? createTemplateState()
  } catch {
    return createTemplateState()
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState)
  const [storageOk, setStorageOk] = useState(true)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setStorageOk(true)
    } catch {
      // z. B. privater Modus oder blockierter Speicher: App funktioniert trotzdem, nur ohne Speichern
      setStorageOk(false)
    }
  }, [state])

  return { state, dispatch, storageOk }
}
