// Shared types for Poster Studio — the full 1:1 feature model.

export type CharsetId =
  | 'classic'
  | 'terminal'
  | 'binary'
  | 'japanese'
  | 'pixel'
  | 'thin'

export interface CharsetPreset {
  id: CharsetId
  label: string
  zh: string
  // Ordered dark -> light (index 0 = densest/darkest character).
  ramp: string
}

// Every shader effect available in the shader list.
export type PrimId =
  | 'plain'
  | 'gradient'
  | 'poster'
  | 'newspaper'
  | 'mosaic'
  | 'halftone'
  | 'stripedglass'
  | 'liquidmetal'
  | 'neon'
  | 'greenscreen'
  | 'blueprint'
  | 'hacker'
  | 'flexo'
  | 'orangeprint'
  | 'pop'
  | 'retro'
  | 'cotton'
  | 'cardboard'
  | 'fiber'
  | 'grid'
  | 'tech'
  | 'abstract'
  | 'natural'
  | 'wave'
  | 'waterdrop'
  | 'hexagon'
  | 'square'
  | 'dotmatrix'
  | 'glow'
  | 'darkpattern'
  | 'vignette'
  | 'noise'
  | 'layerblur'
  | 'blur'
  | 'grayscale'
  | 'saturation'
  | 'hue'
  | 'exposure'
  | 'invert'
  | 'heavyink'
  | 'detail'
  | 'line'
  | 'symbol'
  | 'letter'
  | 'digit'
  | 'irregular'
  | 'distort'
  | 'crease'
  | 'wrinkle'
  | 'cohesion'
  | 'scatter'
  | 'spread'
  | 'cover'
  | 'stretch'
  | 'skew'
  | 'scale'
  | 'rotate'
  | 'offset'
  | 'hole'
  | 'coarsegrain'
  | 'finegrain'
  | 'rough'

export type RenderMode = 'ascii' | 'mosaic' | 'dots'

export interface ShaderParam {
  key: string
  label: string
  zh: string
  min: number
  max: number
  step: number
  def: number
}

export interface ShaderDef {
  id: PrimId
  label: string
  zh: string
  category: string
  mode: RenderMode
  // If set, overrides the charset ramp (glyph-family shaders).
  rampOverride?: string
  // If true, the effect changes geometry in place (skip strength-blend).
  geometric?: boolean
  // Pixel-buffer transform (color/geometric). Undefined => mode only.
  prim?: import('./primitives').PrimFn
  params: ShaderParam[]
}

export interface TransformState {
  rotation: number // degrees
  offsetX: number // px
  offsetY: number // px
  scale: number // % (100 = none)
  skew: number // degrees
  stretch: number // % vertical (100 = none)
  distort: number // amount
}

export interface AppearanceState {
  bgColor: string
  fgColor: string
  includeBackground: boolean
  originalColor: boolean
  filterStrength: number // % (100 = full effect)
  filterOpacity: number // % (100 = opaque)
}

export interface AdjustState {
  brightness: number // 0-200, 100 = none
  contrast: number // 0-200
  saturation: number // 0-200
  hue: number // degrees -180..180
  exposure: number // -100..100
  invert: number // 0..100
}

export interface CharsetParams {
  charSize: number
  charDensity: number
  charColor: string
}

export interface EditorState {
  charsetId: CharsetId
  charsetParams: CharsetParams
  shaderId: PrimId
  shaderParams: Record<string, number>
  transform: TransformState
  appearance: AppearanceState
  adjust: AdjustState
  presetId: string
  randomSeed: number
}

// ---------- Layers system (Task C) ----------

export type LayerType = 'ascii' | 'image' | 'text'

export interface LayerTransform {
  x: number // canvas px offset from center
  y: number
  scale: number // 1 = 100%
  rotation: number // degrees
}

export interface AsciiLayerProps {
  // The ASCII conversion is driven by the global EditorState controls
  // (charset, shader, transform, appearance, adjust). No extra props.
}

export interface ImageLayerProps {
  // Image layer renders the source image directly (un-converted).
}

export interface TextLayerProps {
  text: string
  fontFamily: string // system + uploaded font names
  fontSize: number // px (baseline, before layer scale)
  fill: string // fill color
  strokeEnabled: boolean
  strokeColor: string
  strokeWidth: number // px
  shadowEnabled: boolean
  shadowColor: string
  shadowBlur: number
  shadowX: number
  shadowY: number
  bold: boolean
  italic: boolean
}

export interface BaseLayer {
  id: string
  type: LayerType
  name: string
  visible: boolean
  opacity: number // 0..100
  transform: LayerTransform
  // zOrder implied by array index in LayersState.layers (0 = bottom)
  props: AsciiLayerProps | ImageLayerProps | TextLayerProps
}

export interface AsciiLayer extends BaseLayer {
  type: 'ascii'
  props: AsciiLayerProps
}
export interface ImageLayer extends BaseLayer {
  type: 'image'
  props: ImageLayerProps
}
export interface TextLayer extends BaseLayer {
  type: 'text'
  props: TextLayerProps
}
export type Layer = AsciiLayer | ImageLayer | TextLayer

export interface LayersState {
  layers: Layer[]
  selectedId: string | null
}
