// Poster Studio — ASCII conversion engine (100% client-side, no backend).

export type CharsetId =
  | 'classic'
  | 'terminal'
  | 'binary'
  | 'japanese'
  | 'pixel'
  | 'thin'

export type FilterId =
  | 'plain'
  | 'paper'
  | 'glass'
  | 'dither'
  | 'halftone'
  | 'mosaic'
  | 'roundsquare'
  | 'cmyk'

export interface CharsetPreset {
  id: CharsetId
  label: string
  // Ordered dark -> light (index 0 = densest/darkest character).
  ramp: string
}

// Six charset presets (English labels).
export const CHARSETS: CharsetPreset[] = [
  {
    id: 'classic',
    label: 'ASCII Classic',
    ramp:
      '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  },
  { id: 'terminal', label: 'Terminal', ramp: '█▓▒░ ' },
  { id: 'binary', label: 'Binary', ramp: '10' },
  {
    id: 'japanese',
    label: 'Japanese',
    ramp: 'アイウエオカキクケコサシスセソタチツテト',
  },
  { id: 'pixel', label: 'Pixel', ramp: '01░▒▓██' },
  {
    id: 'thin',
    label: 'Thin Line',
    ramp: '─│┌┐└┘├┤┬┴┼╴╵╶╷',
  },
]

// Eight filter / appearance presets (English labels).
export const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'plain', label: 'Plain' },
  { id: 'paper', label: 'Paper' },
  { id: 'glass', label: 'Glass' },
  { id: 'dither', label: 'Dither' },
  { id: 'halftone', label: 'Halftone' },
  { id: 'mosaic', label: 'Mosaic' },
  { id: 'roundsquare', label: 'Round-Square' },
  { id: 'cmyk', label: 'CMYK' },
]

export interface PosterOptions {
  charsetId: CharsetId
  filterId: FilterId
  columns: number // output resolution (40-200)
  brightness: number // 0-200, default 100
  contrast: number // 0-200, default 100
}

export const DEFAULT_OPTIONS: PosterOptions = {
  charsetId: 'classic',
  filterId: 'plain',
  columns: 120,
  brightness: 100,
  contrast: 100,
}

// Character cell aspect: monospace glyph width / height.
export const CELL_ASPECT = 0.6

export interface Cell {
  lum: number // 0 (dark) .. 1 (light) after brightness/contrast
  r: number
  g: number
  b: number
}

// 4x4 ordered (Bayer) dither matrix, normalized to [0,1).
export const BAYER: number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((v) => (v + 0.5) / 16)
