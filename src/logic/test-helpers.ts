/** Hilfsfunktionen für die Tests */
import { createTemplateState } from './template'
import type { AppState, Quad } from './types'

export type PointsMap = Record<string, Quad<number | null>>

export const TEMPLATE_IDS = ['m', 'ch', 'd', 'sw', 'e', 'mu', 'ge', 'ph', 'if', 'kr', 'sp'] as const

export function uniform(value: number | null): Quad<number | null> {
  return [value, value, value, value]
}

export function allSubjects(value: number): PointsMap {
  return Object.fromEntries(TEMPLATE_IDS.map((id) => [id, uniform(value)]))
}

/** Vorlage mit Punkten; `patch` kann den Zustand zusätzlich verändern */
export function templateWith(points: PointsMap, patch?: (state: AppState) => void): AppState {
  const state = createTemplateState()
  for (const subject of state.subjects) {
    const p = points[subject.id]
    if (p) subject.points = [...p] as Quad<number | null>
  }
  patch?.(state)
  return state
}

/** Reproduzierbarer Zufallsgenerator (mulberry32) */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
