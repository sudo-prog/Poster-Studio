// Primitives — real client-side pixel-buffer transforms on ImageData.
// Every effect in shaders.ts dispatches to one or more of these.
// A PrimFn receives the raw float buffer and a normalized `strength` (0..1)
// plus a seeded RNG (0..1) for stable, reproducible randomness.

export type RGBA = Float32Array // length = w*h*4, values 0..255

export interface PrimCtx {
  w: number
  h: number
  strength: number // 0..1 (effect intensity)
  amount: number // slider value (raw, effect-defined range)
  rng: () => number
  param: (key: string, fallback: number) => number
}

export type PrimFn = (buf: RGBA, ctx: PrimCtx) => void

// ---------- helpers ----------
export function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
export function lumOf(r: number, g: number, b: number): number {
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255
}
function idx(x: number, y: number, w: number): number {
  return (y * w + x) * 4
}
export function getPx(buf: RGBA, w: number, x: number, y: number): [number, number, number, number] {
  const i = idx(x, y, w)
  return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]
}
export function setPx(buf: RGBA, w: number, x: number, y: number, r: number, g: number, b: number, a = 255): void {
  const i = idx(x, y, w)
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a
}

// Seeded RNG (mulberry32) — deterministic per seed value.
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- color-matrix style adjustments ----------
export function adjustBrightness(buf: RGBA, p: number): void {
  // p: -100..100
  const d = (p / 100) * 255
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] += d; buf[i + 1] += d; buf[i + 2] += d
  }
}
export function adjustContrast(buf: RGBA, p: number): void {
  // p: -100..100
  const f = (259 * (p + 255)) / (255 * (259 - p))
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = f * (buf[i] - 128) + 128
    buf[i + 1] = f * (buf[i + 1] - 128) + 128
    buf[i + 2] = f * (buf[i + 2] - 128) + 128
  }
}
export function adjustSaturation(buf: RGBA, p: number): void {
  // p: -100..100, saturation scale
  const s = 1 + p / 100
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i], g = buf[i + 1], b = buf[i + 2]
    const l = 0.299 * r + 0.587 * g + 0.114 * b
    buf[i] = l + (r - l) * s
    buf[i + 1] = l + (g - l) * s
    buf[i + 2] = l + (b - l) * s
  }
}
export function adjustHue(buf: RGBA, deg: number): void {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  // rotate in YIQ-ish chroma space (cheap, good enough)
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i] / 255, g = buf[i + 1] / 255, b = buf[i + 2] / 255
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    const u = -0.147 * r - 0.289 * g + 0.436 * b
    const v = 0.615 * r - 0.515 * g - 0.1 * b
    const u2 = u * cos - v * sin
    const v2 = u * sin + v * cos
    buf[i] = clamp255((y + 0.946 * u2 + 0.623 * v2) * 255)
    buf[i + 1] = clamp255((y - 0.274 * u2 - 0.636 * v2) * 255)
    buf[i + 2] = clamp255((y - 1.1 * u2 + 1.7 * v2) * 255)
  }
}
export function adjustExposure(buf: RGBA, p: number): void {
  // p: -100..100 -> multiply in linear-ish space
  const f = Math.pow(2, p / 100)
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] *= f; buf[i + 1] *= f; buf[i + 2] *= f
  }
}
export function invert(buf: RGBA, amt: number): void {
  // amt: 0..100
  const a = amt / 100
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] += (255 - buf[i] * 2) * a
    buf[i + 1] += (255 - buf[i + 1] * 2) * a
    buf[i + 2] += (255 - buf[i + 2] * 2) * a
  }
}

// ---------- convolution ----------
export function convolve(buf: RGBA, w: number, h: number, kernel: number[][], divisor = 1): void {
  const k = kernel.length
  const half = (k / 2) | 0
  const src = buf.slice()
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0
      for (let ky = 0; ky < k; ky++) {
        for (let kx = 0; kx < k; kx++) {
          const sx = Math.min(w - 1, Math.max(0, x + kx - half))
          const sy = Math.min(h - 1, Math.max(0, y + ky - half))
          const si = (sy * w + sx) * 4
          const kv = kernel[ky][kx] / divisor
          r += src[si] * kv; g += src[si + 1] * kv; b += src[si + 2] * kv
        }
      }
      const di = (y * w + x) * 4
      buf[di] = r; buf[di + 1] = g; buf[di + 2] = b
    }
  }
}

export function blur(buf: RGBA, w: number, h: number, radius: number): void {
  if (radius <= 0) return
  // box blur approximation (separable, a few passes)
  const passes = Math.max(1, Math.round(radius))
  for (let p = 0; p < passes; p++) boxBlur(buf, w, h, Math.max(1, Math.round(radius / passes)))
}
function boxBlur(buf: RGBA, w: number, h: number, r: number): void {
  const tmp = buf.slice()
  const norm = 1 / (r * 2 + 1)
  // horizontal
  for (let y = 0; y < h; y++) {
    let tr = 0, tg = 0, tb = 0
    for (let i = -r; i <= r; i++) {
      const xx = Math.min(w - 1, Math.max(0, i))
      const si = (y * w + xx) * 4
      tr += tmp[si]; tg += tmp[si + 1]; tb += tmp[si + 2]
    }
    for (let x = 0; x < w; x++) {
      const di = (y * w + x) * 4
      buf[di] = tr * norm; buf[di + 1] = tg * norm; buf[di + 2] = tb * norm
      const out = x - r
      const inX = Math.min(w - 1, x + r + 1)
      if (out >= 0) { const oi = (y * w + out) * 4; tr -= tmp[oi]; tg -= tmp[oi + 1]; tb -= tmp[oi + 2] }
      const ii = (y * w + inX) * 4
      tr += tmp[ii]; tg += tmp[ii + 1]; tb += tmp[ii + 2]
    }
  }
  const tmp2 = buf.slice()
  // vertical
  for (let x = 0; x < w; x++) {
    let tr = 0, tg = 0, tb = 0
    for (let i = -r; i <= r; i++) {
      const yy = Math.min(h - 1, Math.max(0, i))
      const si = (yy * w + x) * 4
      tr += tmp2[si]; tg += tmp2[si + 1]; tb += tmp2[si + 2]
    }
    for (let y = 0; y < h; y++) {
      const di = (y * w + x) * 4
      buf[di] = tr * norm; buf[di + 1] = tg * norm; buf[di + 2] = tb * norm
      const out = y - r
      const inY = Math.min(h - 1, y + r + 1)
      if (out >= 0) { const oi = (out * w + x) * 4; tr -= tmp2[oi]; tg -= tmp2[oi + 1]; tb -= tmp2[oi + 2] }
      const ii = (inY * w + x) * 4
      tr += tmp2[ii]; tg += tmp2[ii + 1]; tb += tmp2[ii + 2]
    }
  }
}

// ---------- pattern / artistic overlays ----------
export function addGrain(buf: RGBA, amount: number, rng: () => number, coarse: boolean): void {
  // amount: 0..100; coarse => blocky grain
  const n = amount * 0.9
  if (coarse) {
    const total = buf.length / 4
    const bs = 4
    let y = 0
    while (y < total) {
      const gx = (rng() - 0.5) * n
      for (let k = 0; k < bs && y + k < total; k++) {
        const i = (y + k) * 4
        buf[i] += gx; buf[i + 1] += gx; buf[i + 2] += gx
      }
      y += bs
    }
    return
  }
  for (let i = 0; i < buf.length; i += 4) {
    const g = (rng() - 0.5) * n
    buf[i] += g; buf[i + 1] += g; buf[i + 2] += g
  }
}

export function vignette(buf: RGBA, w: number, h: number, amount: number): void {
  const cx = w / 2, cy = h / 2
  const maxD = Math.sqrt(cx * cx + cy * cy)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy) / maxD
      const f = 1 - clamp01((d - (1 - amount)) / amount) * 0.85
      const i = (y * w + x) * 4
      buf[i] *= f; buf[i + 1] *= f; buf[i + 2] *= f
    }
  }
}

// Map luminance to a duotone palette (two hex colors).
export function duotone(buf: RGBA, c0: [number, number, number], c1: [number, number, number], invertLum = false): void {
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i], g = buf[i + 1], b = buf[i + 2]
    let l = lumOf(r, g, b)
    if (invertLum) l = 1 - l
    buf[i] = c0[0] + (c1[0] - c0[0]) * l
    buf[i + 1] = c0[1] + (c1[1] - c0[1]) * l
    buf[i + 2] = c0[2] + (c1[2] - c0[2]) * l
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Overlay a repeating pattern of tinted cells (grid/tech/abstract/fiber etc).
export function patternOverlay(
  buf: RGBA,
  w: number,
  h: number,
  cell: number,
  bg: [number, number, number],
  fg: [number, number, number],
  style: 'grid' | 'tech' | 'hex' | 'dots' | 'fiber' | 'abstract',
  amount: number,
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = false
      switch (style) {
        case 'grid': {
          on = x % cell < 1 || y % cell < 1
          break
        }
        case 'tech': {
          const gx = x % cell, gy = y % cell
          on = (gx === 0 || gy === 0) || (gx + gy === cell) || (gx === (cell / 2 | 0) && gy < cell)
          break
        }
        case 'hex': {
          const hh = cell
          const yy = y % (hh * 3)
          const xx = x % (hh * 2)
          on = (Math.abs(((yy % hh) - hh / 2)) + Math.abs(((xx % (hh * 2)) - hh)) < cell * 0.18)
          break
        }
        case 'dots': {
          const gx = x % cell, gy = y % cell
          const dx = gx - cell / 2, dy = gy - cell / 2
          on = dx * dx + dy * dy < (cell * 0.22) * (cell * 0.22)
          break
        }
        case 'fiber': {
          on = (((x + y) % cell) === 0) || (((x - y + cell) % cell) === 0)
          break
        }
        case 'abstract': {
          on = ((x * 13 + y * 7) % cell) < 2
          break
        }
      }
      const i = (y * w + x) * 4
      if (on) {
        buf[i] = buf[i] * (1 - amount) + fg[0] * amount
        buf[i + 1] = buf[i + 1] * (1 - amount) + fg[1] * amount
        buf[i + 2] = buf[i + 2] * (1 - amount) + fg[2] * amount
      } else if (amount > 0.05) {
        buf[i] = buf[i] * (1 - amount * 0.5) + bg[0] * amount * 0.5
        buf[i + 1] = buf[i + 1] * (1 - amount * 0.5) + bg[1] * amount * 0.5
        buf[i + 2] = buf[i + 2] * (1 - amount * 0.5) + bg[2] * amount * 0.5
      }
    }
  }
}

// Geometric rebuilders — produce a new buffer at new dimensions.
export function rebuild(
  nw: number,
  nh: number,
  fill: (x: number, y: number) => [number, number, number, number],
): RGBA {
  const out = new Float32Array(nw * nh * 4)
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const [r, g, b, a] = fill(x, y)
      const i = (y * nw + x) * 4
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = a
    }
  }
  return out
}

export function sampleNearest(buf: RGBA, w: number, h: number, fx: number, fy: number): [number, number, number, number] {
  const x = Math.min(w - 1, Math.max(0, Math.round(fx)))
  const y = Math.min(h - 1, Math.max(0, Math.round(fy)))
  const i = (y * w + x) * 4
  return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]
}

export { clamp01 }
