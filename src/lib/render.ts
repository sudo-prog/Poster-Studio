import { CHARSETS, type PosterOptions } from './ascii'
import { buildGrid } from './ascii_grid'

const FONT = "bold {px}px 'Courier New', monospace"

export interface RenderResult {
  canvas: HTMLCanvasElement
  cols: number
  rows: number
}

// Render the source image into an ASCII poster canvas per the active presets.
export function renderPoster(
  src: HTMLCanvasElement,
  opts: PosterOptions,
): RenderResult {
  const { grid, cols, rows } = buildGrid(src, opts)
  const charset = CHARSETS.find((c) => c.id === opts.charsetId)!
  const ramp = charset.ramp
  const px = 11
  const cellW = px * 0.6
  const cellH = px
  const out = document.createElement('canvas')
  out.width = Math.ceil(cols * cellW)
  out.height = Math.ceil(rows * cellH)
  const ctx = out.getContext('2d')!

  const f = opts.filterId
  const paper = f === 'paper'
  const bg = paper ? '#f4ecd8' : '#0f1117'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, out.width, out.height)

  ctx.textBaseline = 'top'
  ctx.font = FONT.replace('{px}', String(px))

  const charFor = (lum: number): string => {
    const idx = Math.round(lum * (ramp.length - 1))
    return ramp[clampIdx(idx, ramp.length)] ?? ' '
  }

  if (f === 'halftone') {
    // Dot-size halftone: radius grows with darkness.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = grid[y * cols + x]
        const cx = x * cellW + cellW / 2
        const cy = y * cellH + cellH / 2
        const rad = (1 - c.lum) * (cellW / 1.7)
        ctx.fillStyle = paper
          ? `rgb(${40 - c.r * 0},30,20)`
          : `rgb(${230 - c.lum * 20},233,240)`
        ctx.beginPath()
        ctx.arc(cx, cy, rad, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (f === 'mosaic') {
    // Block pixelation: solid square cell color.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = grid[y * cols + x]
        ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`
        const rx = x * cellW
        const ry = y * cellH
        ctx.fillRect(rx, ry, cellW, cellH)
      }
    }
  } else {
    // Text-based renderers (plain / paper / glass / dither / roundsquare / cmyk).
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = grid[y * cols + x]
        const ch = charFor(c.lum)
        if (ch === ' ') continue
        if (f === 'cmyk') {
          // Color the glyph by CMYK separation of the source pixel.
          const R = c.r / 255
          const G = c.g / 255
          const B = c.b / 255
          const k = 1 - Math.max(R, G, B)
          if (k > 0.6) ctx.fillStyle = '#15171c'
          else {
            const denom = 1 - k || 1
            const C = (1 - R - k) / denom
            const M = (1 - G - k) / denom
            const Y = (1 - B - k) / denom
            if (C >= M && C >= Y) ctx.fillStyle = '#00b3d6'
            else if (M >= Y) ctx.fillStyle = '#d6006e'
            else ctx.fillStyle = '#f5c400'
          }
        } else if (paper) {
          ctx.fillStyle = `rgba(43,38,32,${0.25 + c.lum * 0.75})`
        } else {
          ctx.fillStyle = `rgba(230,233,240,${0.18 + (1 - c.lum) * 0.82})`
        }
        const rx = x * cellW
        const ry = y * cellH
        if (f === 'roundsquare') {
          ctx.fillStyle = paper ? 'rgba(43,38,32,0.10)' : 'rgba(91,140,255,0.10)'
          roundRect(ctx, rx + 1, ry + 1, cellW - 2, cellH - 2, 3)
          ctx.fill()
          ctx.fillStyle = paper ? '#2b2620' : '#e6e9f0'
        }
        ctx.fillText(ch, rx, ry)
      }
    }
    if (f === 'glass') {
      // Subtle horizontal stripe overlay.
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      for (let y = 0; y < out.height; y += 6) ctx.fillRect(0, y, out.width, 2)
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      for (let y = 3; y < out.height; y += 6) ctx.fillRect(0, y, out.width, 2)
    }
  }

  return { canvas: out, cols, rows }
}

function clampIdx(v: number, len: number): number {
  return v < 0 ? 0 : v >= len ? len - 1 : v
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
