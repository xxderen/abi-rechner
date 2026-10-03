// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './logic/serialization'

beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = ''
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

afterEach(() => cleanup())

const tab = (name: RegExp) => fireEvent.click(screen.getAllByRole('link', { name })[0])

describe('App (Smoke-Test)', () => {
  it('zeigt Titel, Vorlage und Haftungsausschluss', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Abi-Rechner' })).toBeTruthy()
    expect(screen.getByText(/Inoffizieller Rechner – keine Gewähr/)).toBeTruthy()
    expect(screen.getByLabelText('Mathematik Q1.1')).toBeTruthy()
    expect(screen.getByLabelText('Sport Q2.2')).toBeTruthy()
  })

  it('rendert alle vier Bereiche ohne Fehler', () => {
    render(<App />)
    tab(/Zulassung/)
    expect(screen.getByText('Zulassungsvoraussetzungen')).toBeTruthy()
    tab(/Abitur/)
    expect(screen.getByText('Abiturprüfungen')).toBeTruthy()
    tab(/Ergebnis/)
    expect(screen.getByText('Gesamtqualifikation')).toBeTruthy()
    tab(/Kurse & Noten/)
    expect(screen.getByText('Einstellungen')).toBeTruthy()
  })

  it('rechnet live: Prognosen füllen → Block I, Prüfungen → Block II und Note', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Leere Prognosefelder füllen…' }))
    fireEvent.click(screen.getByLabelText('Überall mit demselben Wert'))
    fireEvent.click(screen.getByRole('button', { name: '44 Felder füllen' }))
    expect(screen.getByRole('button', { name: /^Block I\s*400$/ })).toBeTruthy()

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)
    expect(saved.subjects[0].points).toEqual([10, 10, 10, 10])

    tab(/Zulassung/)
    expect(screen.getByText('Zugelassen, sofern Ø 34 Wochenstunden')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Ich habe im Schnitt mindestens 34 Wochenstunden.'))
    expect(screen.getByText('Zugelassen ✔')).toBeTruthy()

    tab(/Abitur/)
    fireEvent.change(screen.getByLabelText('1. Fach schriftlich'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('2. Fach schriftlich'), { target: { value: '11' } })
    fireEvent.change(screen.getByLabelText('3. Fach schriftlich'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('4. Fach mündlich'), { target: { value: '10' } })
    // 60 + 55 + 50 + 50 = 215
    expect(screen.getByRole('button', { name: /^Block II\s*215$/ })).toBeTruthy()
    expect(screen.getByText('Bestanden ✔')).toBeTruthy()

    tab(/Ergebnis/)
    // 400 + 215 = 615 → 2,2
    expect(screen.getByRole('button', { name: /^Gesamt\s*615$/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Note\s*2,2$/ })).toBeTruthy()
    expect(screen.getByText('Änderung der Durchschnittsnote')).toBeTruthy()
  })

  it('ungültige Eingaben (16) werden nicht übernommen', () => {
    render(<App />)
    const input = screen.getByLabelText('Mathematik Q1.1') as HTMLInputElement
    fireEvent.change(input, { target: { value: '16' } })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)
    expect(saved.subjects[0].points[0]).toBeNull()
  })
})
