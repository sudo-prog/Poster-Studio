// Poster Studio — full client-side render pipeline.
// transform -> adjust -> shader primitive -> grid -> output canvas.
import {
  CHARSETS,
  DEFAULT_STATE,
  densityRamp,
} from './ascii'
import type { EditorState } from './types'
import { SHADER_MAP, cmykColor } from './shaders'
import * as P from './primitives'

const FONT = "bold {px}px 'Courier New', monospace"

export interface RenderResult {
  canvas: HTMLCanvasElement
  cols: number
  rows: number
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

// Run the pixel-buffer pipeline (adjust + shader primitive) into a Float32 ImageData-like buffer.
function buildBuffer(src: HTMLCanvasElement, opts: EditorState): { buf: P.RGBA; w: number; h: number } {
  const tr = opts.transform
  const ad = opts.adjust
  const ap = opts.appearance

  // --- Transform step (draw source into a transformed canvas) ---
  const sw = src.width, sh = src.height
  const scale = tr.scale / 100
  const stretch = tr.stretch / 100
  const rot = (tr.rotation * Math.PI) / 180
  const skew = (tr.skew * Math.PI) / 180
  const dist = tr.distort

  // Compute output size from transform.
  const effW = Math.max(1, Math.round(sw * scale))
  const effH = Math.max(1, Math.round(sh * scale * stretch))
  // add padding for rotation / offset
  const pad = Math.ceil(Math.max(effW, effH) * 0.45)
  const W = effW + pad * 2
  const H = effH + pad * 2

  const tc = document.createElement('canvas')
  tc.width = W; tc.height = H
  const tctx = tc.getContext('2d')!
  tctx.fillStyle = ap.includeBackground ? ap.bgColor : 'rgba(0,0,0,0)'
  tctx.fillRect(0, 0, W, H)
  tctx.save()
  tctx.translate(W / 2, H / 2)
  tctx.rotate(rot)
  tctx.transform(1, 0, Math.tan(skew), 1, 0, 0)
  if (dist > 0) tctx.transform(1, Math.tan(dist / 100), 0, 1, 0, 0)
  tctx.translate(-effW / 2 + tr.offsetX * 0.5, -effH / 2 + tr.offsetY * 0.5)
  tctx.drawImage(src, 0, 0, effW, effH)
  tctx.restore()

  const img = tctx.getImageData(0, 0, W, H)
  const buf = Float32Array.from(img.data)

  // --- Adjust step ---
  if (ad.brightness !== 100) P.adjustBrightness(buf, ad.brightness - 100)
  if (ad.contrast !== 100) P.adjustContrast(buf, ad.contrast - 100)
  if (ad.saturation !== 100) P.adjustSaturation(buf, ad.saturation - 100)
  if (ad.hue !== 0) P.adjustHue(buf, ad.hue)
  if (ad.exposure !== 0) P.adjustExposure(buf, ad.exposure)
  if (ad.invert > 0) P.invert(buf, ad.invert)
  // note: clamp afterwards
  for (let i = 0; i < buf.length; i++) buf[i] = P.clamp255(buf[i])

  // --- Shader primitive step ---
  const def = SHADER_MAP[opts.shaderId]
  if (def.prim && (def.geometric || ap.filterStrength > 0)) {
    const strength = clamp(ap.filterStrength / 100, 0, 1)
    const rng = P.makeRng(opts.randomSeed * 7919 + opts.shaderId.length * 131 + 17)
    def.prim(buf, {
      w: W,
      h: H,
      strength,
      amount: ap.filterStrength,
      rng,
      param: (key, fallback) => {
        const v = opts.shaderParams[key]
        return v === undefined ? fallback : v
      },
    })
    for (let i = 0; i < buf.length; i++) buf[i] = P.clamp255(buf[i])
  }

  return { buf, w: W, h: H }
}

export interface GridCell {
  lum: number
  r: number
  g: number
  b: number
  a: number
}

// Build the char grid from the processed buffer at the requested resolution.
function buildGrid(
  buf: P.RGBA,
  w: number,
  h: number,
  cols: number,
): { grid: GridCell[]; cols: number; rows: number } {
  cols = clamp(Math.round(cols), 10, 400)
  const rows = Math.max(1, Math.round(cols * (0.6 * h) / w))

  const grid: GridCell[] = new Array(cols * rows)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const fx = (x + 0.5) / cols * w
      const fy = (y + 0.5) / rows * h
      const [r, g, b, a] = P.sampleNearest(buf, w, h, fx, fy)
      let lum = P.lumOf(r, g, b)
      grid[y * cols + x] = { lum, r, g, b, a }
    }
  }
  return { grid, cols, rows }
}

// Main entry: render source + editor state into an ASCII poster canvas.
export function renderPoster(src: HTMLCanvasElement, opts: EditorState): RenderResult {
  const { buf, w, h } = buildBuffer(src, opts)
  // resolution: derive base cols from char size (smaller char -> more cols)
  const px = clamp(opts.charsetParams.charSize, 4, 28)
  const baseCols = clamp(Math.round(w / px), 10, 400)
  const { grid, cols, rows } = buildGrid(buf, w, h, baseCols)

  const charset = CHARSETS.find((c) => c.id === opts.charsetId) ?? CHARSETS[0]
  const def = SHADER_MAP[opts.shaderId] ?? SHADER_MAP.plain
  const rampSrc = def.rampOverride ?? charset.ramp
  const ramp = densityRamp(rampSrc, opts.charsetParams.charDensity)

  const cellW = px * 0.6
  const cellH = px
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.ceil(cols * cellW))
  out.height = Math.max(1, Math.ceil(rows * cellH))
  const ctx = out.getContext('2d')!

  const ap = opts.appearance
  ctx.fillStyle = ap.includeBackground ? ap.bgColor : 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, out.width, out.height)

  const mode = def.mode
  const paper = ap.includeBackground && isPaperLight(ap.bgColor)
  ctx.textBaseline = 'top'
  ctx.font = FONT.replace('{px}', String(px))

  const charFor = (lum: number): string => {
    const idx = Math.round(lum * (ramp.length - 1))
    const i = clamp(idx, 0, ramp.length - 1)
    return ramp[i] ?? ' '
  }

  const opacity = clamp(ap.filterOpacity / 100, 0, 1)

  if (mode === 'mosaic') {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = grid[y * cols + x]
        if (!ap.includeBackground && c.a < 8) continue
        if (ap.originalColor) {
          ctx.fillStyle = `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${opacity})`
        } else {
          ctx.fillStyle = cmykColor(c.r, c.g, c.b)
          ctx.globalAlpha = opacity
        }
        ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5)
        ctx.globalAlpha = 1
      }
    }
  } else if (mode === 'dots') {
    const cx0 = cellW / 2, cy0 = cellH / 2
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = grid[y * cols + x]
        if (!ap.includeBackground && c.a < 8) continue
        const cx = x * cellW + cx0
        const cy = y * cellH + cy0
        const rad = (1 - c.lum) * (cellW / 1.7)
        if (ap.originalColor) ctx.fillStyle = `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${opacity})`
        else { ctx.fillStyle = paper ? 'rgb(40,30,20)' : `rgb(${230 - c.lum * 20},233,240)`; ctx.globalAlpha = opacity }
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  } else {
    // ascii text renderer
    const fgOverride = ap.originalColor ? null : opts.charsetParams.charColor
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = grid[y * cols + x]
        if (!ap.includeBackground && c.a < 8) continue
        const ch = charFor(c.lum)
        if (ch === ' ' && !paper) continue
        const rx = x * cellW
        const ry = y * cellH
        if (ap.originalColor) {
          ctx.fillStyle = `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${opacity})`
        } else {
          ctx.fillStyle = fgOverride ?? `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${opacity})`
          ctx.globalAlpha = opacity
        }
        ctx.fillText(ch, rx, ry)
        ctx.globalAlpha = 1
      }
    }
  }

  return { canvas: out, cols, rows }
}

function isPaperLight(hex: string): boolean {
  const [r, g, b] = P.hexToRgb(hex)
  return (r + g + b) / 3 > 128
}

// ---------- Text + Image layer rendering (Tasks B & C) ----------

// Draw a text layer onto ctx. Coordinates are in the output canvas space.
export function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: import('./types').TextLayer,
  cx: number,
  cy: number,
): void {
  const p = layer.props
  const tf = layer.transform
  ctx.save()
  ctx.globalAlpha = clamp(layer.opacity / 100, 0, 1)
  ctx.translate(cx + tf.x, cy + tf.y)
  ctx.rotate((tf.rotation * Math.PI) / 180)
  ctx.scale(tf.scale, tf.scale)

  const style = `${p.italic ? 'italic ' : ''}${p.bold ? '700 ' : '400 '}${p.fontSize}px ${p.fontFamily}`
  ctx.font = style
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'

  // Drop shadow
  if (p.shadowEnabled) {
    ctx.shadowColor = p.shadowColor
    ctx.shadowBlur = p.shadowBlur
    ctx.shadowOffsetX = p.shadowX
    ctx.shadowOffsetY = p.shadowY
  } else {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  const lines = p.text.split('\n')
  const lineH = p.fontSize * 1.2
  const startY = -((lines.length - 1) * lineH) / 2

  lines.forEach((line, i) => {
    const y = startY + i * lineH
    if (p.strokeEnabled && p.strokeWidth > 0) {
      ctx.strokeStyle = p.strokeColor
      ctx.lineWidth = p.strokeWidth
      ctx.strokeText(line, 0, y)
    }
    ctx.fillStyle = p.fill
    ctx.fillText(line, 0, y)
  })

  ctx.restore()
}

// Draw an image layer onto ctx (the source picture, un-converted).
export function renderImageLayer(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement | HTMLImageElement | null,
  layer: import('./types').ImageLayer,
  cx: number,
  cy: number,
  baseW: number,
  baseH: number,
): void {
  if (!img) return
  ctx.save()
  ctx.globalAlpha = clamp(layer.opacity / 100, 0, 1)
  ctx.translate(cx + layer.transform.x, cy + layer.transform.y)
  ctx.rotate((layer.transform.rotation * Math.PI) / 180)
  ctx.scale(layer.transform.scale, layer.transform.scale)
  // Fit the image to the base poster size, centered.
  const iw = img.width || baseW
  const ih = img.height || baseH
  ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih)
  ctx.restore()
}

// ---------- Compositor (Task C) ----------
// Renders the full layered poster into a single canvas.
export interface CompositeResult {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

export function compositePoster(
  src: HTMLCanvasElement | null,
  opts: EditorState,
  layers: import('./types').Layer[],
  imageSource: HTMLCanvasElement | null,
): CompositeResult {
  // 1) Render the ascii base from source + opts.
  let asciiCanvas: HTMLCanvasElement
  if (src) {
    asciiCanvas = renderPoster(src, opts).canvas
  } else {
    asciiCanvas = document.createElement('canvas')
    asciiCanvas.width = 600
    asciiCanvas.height = 600
  }
  const W = asciiCanvas.width
  const H = asciiCanvas.height
  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'

  const cx = W / 2
  const cy = H / 2

  for (const layer of layers) {
    if (!layer.visible) continue
    if (layer.type === 'ascii') {
      ctx.save()
      ctx.globalAlpha = clamp(layer.opacity / 100, 0, 1)
      ctx.translate(cx + layer.transform.x, cy + layer.transform.y)
      ctx.rotate((layer.transform.rotation * Math.PI) / 180)
      ctx.scale(layer.transform.scale, layer.transform.scale)
      ctx.drawImage(asciiCanvas, -W / 2, -H / 2, W, H)
      ctx.restore()
    } else if (layer.type === 'image') {
      renderImageLayer(ctx, imageSource, layer, cx, cy, W, H)
    } else if (layer.type === 'text') {
      renderTextLayer(ctx, layer, cx, cy)
    }
  }

  return { canvas: out, width: W, height: H }
}

export { DEFAULT_STATE }
