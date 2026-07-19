// Poster Studio — ASCII charset presets + default editor state.
import type { CharsetPreset, CharsetId, EditorState } from './types'

export type { CharsetId }

export const CHARSETS: CharsetPreset[] = [
  {
    id: 'classic',
    label: 'ASCII Classic',
    zh: 'ASCII 经典',
    // Ordered dark -> light (index 0 = densest/darkest character).
    ramp:
      '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ',
  },
  { id: 'terminal', label: 'Terminal', zh: '终端', ramp: '█▓▒░ ' },
  { id: 'binary', label: 'Binary', zh: '二进制', ramp: '10' },
  { id: 'japanese', label: 'Japanese', zh: '日文', ramp: 'アイウエオカキクケコサシスセソタチツテト' },
  { id: 'pixel', label: 'Pixel', zh: '像素', ramp: '01░▒▓██' },
  { id: 'thin', label: 'Thin Line', zh: '细线', ramp: '─│┌┐└┘├┤┬┴┼╴╵╶╷' },
]

// Map a charset-density slider (0..100) to a usable ramp segment length.
// Higher density -> more characters in the ramp (finer gradient).
export function densityRamp(ramp: string, density: number): string {
  const d = Math.max(2, Math.round((density / 100) * ramp.length))
  if (d >= ramp.length) return ramp
  // keep dark..light ordering, sample evenly
  const out: string[] = []
  for (let i = 0; i < d; i++) {
    const idx = Math.round((i / (d - 1)) * (ramp.length - 1))
    out.push(ramp[idx])
  }
  return out.join('')
}

// Character cell aspect: monospace glyph width / height.
export const CELL_ASPECT = 0.6

// 4x4 ordered (Bayer) dither matrix, normalized to [0,1).
export const BAYER: number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((v) => (v + 0.5) / 16)

export const DEFAULT_STATE: EditorState = {
  charsetId: 'classic',
  charsetParams: { charSize: 11, charDensity: 100, charColor: '#e6e9f0' },
  shaderId: 'plain',
  shaderParams: {},
  transform: {
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 100,
    skew: 0,
    stretch: 100,
    distort: 0,
  },
  appearance: {
    bgColor: '#0f1117',
    fgColor: '#e6e9f0',
    includeBackground: true,
    originalColor: false,
    filterStrength: 100,
    filterOpacity: 100,
  },
  adjust: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    exposure: 0,
    invert: 0,
  },
  presetId: 'none',
  randomSeed: 1,
}
