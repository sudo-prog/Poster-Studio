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
