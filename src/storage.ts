import { createDemoDiagram } from './demo'
import type { DiagramSnapshot } from './types'

export const LEGACY_STORAGE_KEY = 'homelab-diagram:v1'
export const DIAGRAMS_STORAGE_KEY = 'homelab-diagrams:v1'

export interface DiagramEntry {
  id: string
  title: string
  updatedAt: string
  snapshot: DiagramSnapshot
}

export interface DiagramsStore {
  version: 1
  currentId: string | null
  diagrams: DiagramEntry[]
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `diagram-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function nowIso() {
  return new Date().toISOString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function emptyStore(): DiagramsStore {
  return { version: 1, currentId: null, diagrams: [] }
}

function createEntryFromSnapshot(snapshot: DiagramSnapshot): DiagramEntry {
  const title = snapshot.title?.trim() || 'Без названия'
  return {
    id: createId(),
    title,
    updatedAt: nowIso(),
    snapshot: { ...snapshot, title },
  }
}

export function parseStoredStore(value: unknown): DiagramsStore | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.diagrams)) {
    return null
  }
  const diagrams = value.diagrams
    .filter(isRecord)
    .map((item) => {
      if (
        typeof item.id !== 'string' ||
        typeof item.title !== 'string' ||
        typeof item.updatedAt !== 'string' ||
        !isRecord(item.snapshot)
      ) {
        return null
      }
      return item as unknown as DiagramEntry
    })
    .filter((item): item is DiagramEntry => Boolean(item))

  return {
    version: 1,
    currentId: typeof value.currentId === 'string' ? value.currentId : null,
    diagrams,
  }
}

export function loadDiagramsStore(): DiagramsStore {
  try {
    const raw = window.localStorage.getItem(DIAGRAMS_STORAGE_KEY)
    if (raw) {
      const parsed = parseStoredStore(JSON.parse(raw) as unknown)
      if (parsed) return parsed
    }
  } catch {
    // ignore
  }

  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as unknown
      if (isRecord(legacy)) {
        const title =
          typeof legacy.title === 'string' && legacy.title.trim()
            ? legacy.title
            : 'Моя схема'
        const snapshot = legacy as unknown as DiagramSnapshot
        const entry = createEntryFromSnapshot({ ...snapshot, title })
        const store: DiagramsStore = {
          version: 1,
          currentId: entry.id,
          diagrams: [entry],
        }
        saveDiagramsStore(store)
        return store
      }
    }
  } catch {
    // ignore
  }

  return emptyStore()
}

export function saveDiagramsStore(store: DiagramsStore) {
  window.localStorage.setItem(DIAGRAMS_STORAGE_KEY, JSON.stringify(store))
}

export function createNewDiagram(title = 'Новая схема'): DiagramEntry {
  const snapshot: DiagramSnapshot = {
    version: 1,
    title,
    nodes: [],
    connections: [],
    groups: [],
  }
  return {
    id: createId(),
    title,
    updatedAt: nowIso(),
    snapshot,
  }
}

export function createDemoEntry(): DiagramEntry {
  const snapshot = createDemoDiagram()
  return {
    id: createId(),
    title: snapshot.title || 'Демо-схема',
    updatedAt: nowIso(),
    snapshot,
  }
}

export function touchEntry(entry: DiagramEntry, snapshot: DiagramSnapshot): DiagramEntry {
  const title = snapshot.title?.trim() || entry.title || 'Без названия'
  return {
    ...entry,
    title,
    updatedAt: nowIso(),
    snapshot: { ...snapshot, title },
  }
}
