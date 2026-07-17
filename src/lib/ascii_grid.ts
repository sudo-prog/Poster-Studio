import {
  CHARSETS,
  type PosterOptions,
  CELL_ASPECT,
  BAYER,
} from './ascii'

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

interface GridCell {
  lum: number // 0 dark .. 1 light
  r: number
  g: number
  b: number
}

// Build a cols x rows grid of averaged/processed source pixels.
export function buildGrid(
  src: HTMLCanvasElement,
  opts: PosterOptions,
): { grid: GridCell[]; cols: number; rows: number } {
  const cols = clamp(Math.round(opts.columns), 10, 400)
  const srcW = src.width
  const srcH = src.height
  const rows = Math.max(1, Math.round(cols * CELL_ASPECT * (srcH / srcW)))

  // Downscale source to a tiny canvas; the browser averages blocks for us.
  const small = document.createElement('canvas')
  small.width = cols
  small.height = rows
  const sctx = small.getContext('2d')!
  sctx.drawImage(src, 0, 0, cols, rows)
  const data = sctx.getImageData(0, 0, cols, rows).data

  const grid: GridCell[] = new Array(cols * rows)
  const cFactor = (opts.contrast - 100) / 100
  const bFactor = opts.brightness / 100
  const useDither = opts.filterId === 'dither'
  const levels = CHARSETS.find((c) => c.id === opts.charsetId)!.ramp.length

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      let lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255
      // contrast
      lum = (lum - 0.5) * (1 + cFactor * 1.3) + 0.5
      // brightness
      lum *= bFactor
      lum = clamp(lum, 0, 1)
      if (useDither) {
        const th = BAYER[(y % 4) * 4 + (x % 4)]
        const v = lum * (levels - 1) + (th - 0.5)
        lum = clamp(Math.round(v) / (levels - 1), 0, 1)
      }
      grid[y * cols + x] = { lum, r, g, b }
    }
  }
  return { grid, cols, rows }
}
