// Undo/redo history stack — stores snapshots of editor state.
import type { EditorState } from './types'

export interface HistoryEntry {
  state: EditorState
  label: string
}

export class History {
  private past: HistoryEntry[] = []
  private future: HistoryEntry[] = []
  // ignore the very first baseline push
  private hasBaseline = false

  // Push a new state, recording the previous as undoable.
  push(prev: EditorState, label: string): void {
    if (!this.hasBaseline) {
      // record an initial baseline so the first change is undoable
      this.past.push({ state: prev, label: 'init' })
      this.hasBaseline = true
    } else {
      this.past.push({ state: prev, label })
    }
    this.future = []
    // cap history depth (target shows ~44 levels)
    if (this.past.length > 60) this.past.shift()
  }

  canUndo(): boolean {
    return this.past.length > 0
  }
  canRedo(): boolean {
    return this.future.length > 0
  }

  // Returns the state to restore on undo, stashing `current` for redo.
  undo(current: EditorState): EditorState | null {
    const prev = this.past.pop()
    if (!prev) return null
    this.future.push({ state: current, label: prev.label })
    return prev.state
  }

  redo(current: EditorState): EditorState | null {
    const nxt = this.future.pop()
    if (!nxt) return null
    this.past.push({ state: current, label: nxt.label })
    return nxt.state
  }

  reset(): void {
    this.past = []
    this.future = []
    this.hasBaseline = false
  }
}
