// Layer factory + pure operations for the Layers system (Task C).
import type {
  Layer,
  TextLayer,
  ImageLayer,
  AsciiLayer,
  LayersState,
  TextLayerProps,
} from './types'

let counter = 0
function uid(prefix: string): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter}`
}

export function makeAsciiLayer(): AsciiLayer {
  return {
    id: uid('ascii'),
    type: 'ascii',
    name: 'ASCII',
    visible: true,
    opacity: 100,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    props: {},
  }
}

export function makeTextLayer(text = 'Poster'): TextLayer {
  const props: TextLayerProps = {
    text,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 64,
    fill: '#e6e9f0',
    strokeEnabled: false,
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 8,
    shadowX: 4,
    shadowY: 4,
    bold: true,
    italic: false,
  }
  return {
    id: uid('text'),
    type: 'text',
    name: 'Text',
    visible: true,
    opacity: 100,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    props,
  }
}

export function makeImageLayer(): ImageLayer {
  return {
    id: uid('image'),
    type: 'image',
    name: 'Image',
    visible: true,
    opacity: 100,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    props: {},
  }
}

export function getSelected(layers: LayersState): Layer | null {
  if (!layers.selectedId) return null
  return layers.layers.find((l) => l.id === layers.selectedId) ?? null
}

// --- pure ops (return new LayersState) ---

export function addLayer(state: LayersState, layer: Layer): LayersState {
  // new layers go on top (end of array)
  return { layers: [...state.layers, layer], selectedId: layer.id }
}

export function removeLayer(state: LayersState, id: string): LayersState {
  const layers = state.layers.filter((l) => l.id !== id)
  const selectedId =
    state.selectedId === id ? (layers[layers.length - 1]?.id ?? null) : state.selectedId
  return { layers, selectedId }
}

export function toggleVisible(state: LayersState, id: string): LayersState {
  return {
    ...state,
    layers: state.layers.map((l) =>
      l.id === id ? { ...l, visible: !l.visible } : l,
    ),
  }
}

export function selectLayer(state: LayersState, id: string): LayersState {
  return { ...state, selectedId: id }
}

export function updateLayerProps(
  state: LayersState,
  id: string,
  patch: Partial<TextLayerProps>,
): LayersState {
  return {
    ...state,
    layers: state.layers.map((l) =>
      l.id === id && l.type === 'text'
        ? { ...l, props: { ...(l as TextLayer).props, ...patch } }
        : l,
    ),
  }
}

export function updateLayerTransform(
  state: LayersState,
  id: string,
  patch: Partial<Layer['transform']>,
): LayersState {
  return {
    ...state,
    layers: state.layers.map((l) =>
      l.id === id ? { ...l, transform: { ...l.transform, ...patch } } : l,
    ),
  }
}

export function setOpacity(state: LayersState, id: string, opacity: number): LayersState {
  return {
    ...state,
    layers: state.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
  }
}

// Move a layer up (towards top) or down (towards bottom) in z-order.
export function reorder(state: LayersState, id: string, dir: 'up' | 'down'): LayersState {
  const idx = state.layers.findIndex((l) => l.id === id)
  if (idx === -1) return state
  const target = dir === 'up' ? idx + 1 : idx - 1
  if (target < 0 || target >= state.layers.length) return state
  const layers = state.layers.slice()
  const [item] = layers.splice(idx, 1)
  layers.splice(target, 0, item)
  return { ...state, layers }
}
