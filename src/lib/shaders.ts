// Shader catalog — all 61 effects from the target, each mapped to a render
// mode + (optional) pixel primitive. Stubs still produce a distinct result.
import type { ShaderDef, PrimId } from './types'
import * as P from './primitives'

function dup(buf: P.RGBA): P.RGBA { return buf.slice() }

// glyph-family ramps for text shaders
const SYMBOLS = '★●◆▲■✦✚⬡☉⌖⏣⚛☯✧❖⬢▣⬣▤'
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const IRREGULAR = 'ʘǪɈƬӨڇ۞ೱ௹ꙮ⍟⎔⏧☌⚿⟁❂ⱱ'
const HACKER = 'ｱｲｳｴｵ01<>{}[]/*-+=$#@%&'

// cmyk-ish color separation helper used by poster / newspaper etc.
function cmykColor(r: number, g: number, b: number): string {
  const R = r / 255, G = g / 255, B = b / 255
  const k = 1 - Math.max(R, G, B)
  if (k > 0.55) return '#15171c'
  const denom = 1 - k || 1
  const C = (1 - R - k) / denom
  const M = (1 - G - k) / denom
  const Y = (1 - B - k) / denom
  if (C >= M && C >= Y) return '#00b3d6'
  if (M >= Y) return '#d6006e'
  return '#f5c400'
}

export const SHADERS: ShaderDef[] = [
  {
    id: 'plain', label: 'Plain', zh: '原图', category: 'Base', mode: 'ascii',
    params: [],
  },
  {
    id: 'gradient', label: 'Gradient', zh: '渐变', category: 'Color', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [10, 12, 20], [255, 90, 160]),
    params: [],
  },
  {
    id: 'poster', label: 'Poster', zh: '海报', category: 'Color', mode: 'ascii',
    prim: (buf, ctx) => {
      const levels = 4
      const thr = ctx.param('levels', 4)
      const lv = thr || levels
      for (let i = 0; i < buf.length; i += 4) {
        const l = P.lumOf(buf[i], buf[i + 1], buf[i + 2])
        const q = Math.round(l * (lv - 1)) / (lv - 1)
        buf[i] = 30 + q * 225
        buf[i + 1] = 20 + q * 90
        buf[i + 2] = 60 + (1 - q) * 120
      }
    },
    params: [{ key: 'levels', label: 'Levels', zh: '色阶', min: 2, max: 8, step: 1, def: 4 }],
  },
  {
    id: 'newspaper', label: 'Newspaper', zh: '报纸', category: 'Color', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [232, 226, 210], [25, 22, 18]),
    params: [],
  },
  {
    id: 'mosaic', label: 'Mosaic', zh: '马赛克', category: 'Grid', mode: 'mosaic',
    prim: (buf, ctx) => {
      const cellV = Math.max(1, Math.round(ctx.param('cell', 8)))
      const cell = cellV
      const w = ctx.w, h = ctx.h
      const src = dup(buf)
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          let r = 0, g = 0, b = 0, n = 0
          for (let yy = 0; yy < cell && y + yy < h; yy++)
            for (let xx = 0; xx < cell && x + xx < w; xx++) {
              const i = ((y + yy) * w + (x + xx)) * 4
              r += src[i]; g += src[i + 1]; b += src[i + 2]; n++
            }
          r /= n; g /= n; b /= n
          for (let yy = 0; yy < cell && y + yy < h; yy++)
            for (let xx = 0; xx < cell && x + xx < w; xx++) {
              const i = ((y + yy) * w + (x + xx)) * 4
              buf[i] = r; buf[i + 1] = g; buf[i + 2] = b
            }
        }
      }
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 2, max: 24, step: 1, def: 8 }],
  },
  {
    id: 'halftone', label: 'Halftone', zh: '半色调点阵', category: 'Grid', mode: 'dots',
    params: [],
  },
  {
    id: 'stripedglass', label: 'Striped Glass', zh: '条纹玻璃', category: 'Texture', mode: 'ascii',
    prim: (buf, ctx) => {
      P.duotone(buf, [12, 18, 30], [120, 200, 255])
      const gap = Math.max(2, Math.round(ctx.param('gap', 6)))
      for (let y = 0; y < ctx.h; y++) {
        const i = y * ctx.w * 4
        const on = (y % (gap * 2)) < gap
        for (let x = 0; x < ctx.w; x++) {
          const j = i + x * 4
          buf[j] += on ? 30 : -20
          buf[j + 1] += on ? 30 : -20
          buf[j + 2] += on ? 40 : -20
        }
      }
    },
    params: [{ key: 'gap', label: 'Gap', zh: '间距', min: 2, max: 16, step: 1, def: 6 }],
  },
  {
    id: 'liquidmetal', label: 'Liquid Metal', zh: '液态金属', category: 'Texture', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [20, 22, 26], [200, 210, 225]),
    params: [],
  },
  {
    id: 'neon', label: 'Neon', zh: '霓虹', category: 'Light', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [15, 5, 30], [255, 40, 200]),
    params: [],
  },
  {
    id: 'greenscreen', label: 'Green Screen', zh: '绿屏', category: 'Color', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [0, 12, 0], [40, 255, 70]),
    params: [],
  },
  {
    id: 'blueprint', label: 'Blueprint', zh: '蓝印', category: 'Color', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [8, 20, 60], [150, 200, 255]),
    params: [],
  },
  {
    id: 'hacker', label: 'Hacker', zh: '黑客', category: 'Glyph', mode: 'ascii',
    rampOverride: HACKER,
    prim: (buf) => P.duotone(buf, [0, 10, 0], [40, 255, 60]),
    params: [],
  },
  {
    id: 'flexo', label: 'Flexo', zh: '柔印', category: 'Color', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [245, 240, 230], [60, 40, 30]),
    params: [],
  },
  {
    id: 'orangeprint', label: 'Orange Print', zh: '橙印', category: 'Color', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [250, 230, 200], [210, 90, 0]),
    params: [],
  },
  {
    id: 'pop', label: 'Pop', zh: '波普', category: 'Color', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [255, 240, 0], [230, 0, 110]),
    params: [],
  },
  {
    id: 'retro', label: 'Retro', zh: '复古', category: 'Color', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [40, 30, 60], [240, 180, 80]),
    params: [],
  },
  {
    id: 'cotton', label: 'Cotton Paper', zh: '棉纸', category: 'Paper', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [244, 236, 216], [60, 50, 40]),
    params: [],
  },
  {
    id: 'cardboard', label: 'Cardboard', zh: '纸板', category: 'Paper', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [200, 170, 120], [90, 60, 30]),
    params: [],
  },
  {
    id: 'fiber', label: 'Fiber', zh: '纤维', category: 'Paper', mode: 'ascii',
    prim: (buf, ctx) => {
      P.duotone(buf, [235, 225, 205], [70, 60, 45])
      const cell = Math.max(2, Math.round(ctx.param('cell', 6)))
      P.patternOverlay(buf, ctx.w, ctx.h, cell, [235, 225, 205], [120, 105, 80], 'fiber', 0.5)
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 2, max: 16, step: 1, def: 6 }],
  },
  {
    id: 'grid', label: 'Grid', zh: '网格', category: 'Grid', mode: 'ascii',
    prim: (buf, ctx) => {
      const cell = Math.max(3, Math.round(ctx.param('cell', 12)))
      P.patternOverlay(buf, ctx.w, ctx.h, cell, [18, 18, 22], [80, 140, 255], 'grid', 0.7)
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 4, max: 40, step: 1, def: 12 }],
  },
  {
    id: 'tech', label: 'Tech', zh: '科技', category: 'Grid', mode: 'ascii',
    prim: (buf, ctx) => {
      const cell = Math.max(4, Math.round(ctx.param('cell', 16)))
      P.patternOverlay(buf, ctx.w, ctx.h, cell, [8, 14, 22], [0, 200, 255], 'tech', 0.65)
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 6, max: 40, step: 1, def: 16 }],
  },
  {
    id: 'abstract', label: 'Abstract', zh: '抽象', category: 'Pattern', mode: 'ascii',
    prim: (buf, ctx) => {
      const cell = Math.max(4, Math.round(ctx.param('cell', 14)))
      P.patternOverlay(buf, ctx.w, ctx.h, cell, [20, 20, 30], [180, 70, 255], 'abstract', 0.5)
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 4, max: 36, step: 1, def: 14 }],
  },
  {
    id: 'natural', label: 'Natural', zh: '自然', category: 'Pattern', mode: 'ascii',
    prim: (buf) => P.duotone(buf, [30, 45, 25], [200, 220, 150]),
    params: [],
  },
  {
    id: 'wave', label: 'Wave', zh: '波浪', category: 'Distort', mode: 'mosaic', geometric: true,
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const amp = ctx.param('amp', 8) * (1 + ctx.strength)
      const src = dup(buf)
      for (let y = 0; y < h; y++) {
        const off = Math.round(Math.sin(y / 18) * amp)
        for (let x = 0; x < w; x++) {
          const [r, g, b, a] = P.sampleNearest(src, w, h, x + off, y)
          const i = (y * w + x) * 4
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a
        }
      }
    },
    params: [{ key: 'amp', label: 'Amplitude', zh: '振幅', min: 0, max: 30, step: 1, def: 8 }],
  },
  {
    id: 'waterdrop', label: 'Water Drop', zh: '水滴', category: 'Distort', mode: 'ascii',
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const cell = Math.max(8, Math.round(ctx.param('cell', 24)))
      const src = dup(buf)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cx = (x / cell | 0) * cell + cell / 2
          const cy = (y / cell | 0) * cell + cell / 2
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
          const off = d < cell / 2 ? (1 - d / (cell / 2)) * cell * 0.18 : 0
          const [r, g, b, a] = P.sampleNearest(src, w, h, x, y + off)
          const i = (y * w + x) * 4
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a
        }
      }
    },
    params: [{ key: 'cell', label: 'Drop', zh: '水珠', min: 8, max: 48, step: 1, def: 24 }],
  },
  {
    id: 'hexagon', label: 'Hexagon', zh: '六边形', category: 'Shape', mode: 'mosaic',
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const cell = Math.max(4, Math.round(ctx.param('cell', 14)))
      const src = dup(buf)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const gx = x % (cell * 2)
          const gy = y % (cell * 2)
          const dx = Math.abs(gx - cell)
          const dy = Math.abs(gy - cell)
          const inHex = dx * 0.866 + dy <= cell
          const [r, g, b] = P.sampleNearest(src, w, h, x, y)
          const i = (y * w + x) * 4
          buf[i] = inHex ? r : 12
          buf[i + 1] = inHex ? g : 12
          buf[i + 2] = inHex ? b : 16
        }
      }
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 4, max: 36, step: 1, def: 14 }],
  },
  {
    id: 'square', label: 'Square', zh: '方形', category: 'Shape', mode: 'mosaic',
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const cell = Math.max(3, Math.round(ctx.param('cell', 12)))
      const src = dup(buf)
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const [r, g, b] = P.sampleNearest(src, w, h, x + cell / 2, y + cell / 2)
          for (let yy = 0; yy < cell && y + yy < h; yy++)
            for (let xx = 0; xx < cell && x + xx < w; xx++) {
              const i = ((y + yy) * w + (x + xx)) * 4
              buf[i] = r; buf[i + 1] = g; buf[i + 2] = b
            }
        }
      }
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 3, max: 32, step: 1, def: 12 }],
  },
  {
    id: 'dotmatrix', label: 'Dot Matrix', zh: '点阵', category: 'Grid', mode: 'dots',
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const cell = Math.max(3, Math.round(ctx.param('cell', 8)))
      const src = dup(buf)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const gx = x % cell, gy = y % cell
          const on = gx === (cell / 2 | 0) && gy === (cell / 2 | 0)
          const [r, g, b] = P.sampleNearest(src, w, h, x, y)
          const i = (y * w + x) * 4
          buf[i] = on ? r : 14
          buf[i + 1] = on ? g : 14
          buf[i + 2] = on ? b : 18
        }
      }
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 3, max: 20, step: 1, def: 8 }],
  },
  {
    id: 'glow', label: 'Glow', zh: '辉光', category: 'Light', mode: 'ascii',
    prim: (buf, ctx) => { P.blur(buf, ctx.w, ctx.h, 2); P.blur(buf, ctx.w, ctx.h, 2) },
    params: [],
  },
  {
    id: 'darkpattern', label: 'Dark Pattern', zh: '暗纹', category: 'Pattern', mode: 'ascii',
    prim: (buf, ctx) => {
      P.duotone(buf, [12, 12, 16], [60, 60, 70])
      P.patternOverlay(buf, ctx.w, ctx.h, 10, [12, 12, 16], [45, 45, 55], 'abstract', 0.6)
    },
    params: [],
  },
  {
    id: 'vignette', label: 'Vignette', zh: '暗角', category: 'Light', mode: 'ascii',
    prim: (buf, ctx) => P.vignette(buf, ctx.w, ctx.h, 0.5),
    params: [],
  },
  {
    id: 'noise', label: 'Noise', zh: '噪点', category: 'Grain', mode: 'ascii',
    prim: (buf, ctx) => P.addGrain(buf, 55, ctx.rng, false),
    params: [],
  },
  {
    id: 'layerblur', label: 'Layer Blur', zh: '图层模糊', category: 'Blur', mode: 'ascii',
    prim: (buf, ctx) => P.blur(buf, ctx.w, ctx.h, 4),
    params: [],
  },
  {
    id: 'blur', label: 'Blur', zh: '模糊', category: 'Blur', mode: 'ascii',
    prim: (buf, ctx) => P.blur(buf, ctx.w, ctx.h, 2),
    params: [],
  },
  {
    id: 'grayscale', label: 'Grayscale', zh: '灰度', category: 'Adjust', mode: 'ascii',
    prim: (buf) => {
      for (let i = 0; i < buf.length; i += 4) {
        const l = P.lumOf(buf[i], buf[i + 1], buf[i + 2])
        buf[i] = l * 255; buf[i + 1] = l * 255; buf[i + 2] = l * 255
      }
    },
    params: [],
  },
  {
    id: 'saturation', label: 'Saturation', zh: '饱和度', category: 'Adjust', mode: 'ascii',
    prim: (buf, ctx) => P.adjustSaturation(buf, ctx.param('amt', 60)),
    params: [{ key: 'amt', label: 'Amount', zh: '强度', min: -100, max: 100, step: 1, def: 60 }],
  },
  {
    id: 'hue', label: 'Hue', zh: '色相', category: 'Adjust', mode: 'ascii',
    prim: (buf, ctx) => P.adjustHue(buf, ctx.param('deg', 90)),
    params: [{ key: 'deg', label: 'Degrees', zh: '角度', min: -180, max: 180, step: 1, def: 90 }],
  },
  {
    id: 'exposure', label: 'Exposure', zh: '曝光', category: 'Adjust', mode: 'ascii',
    prim: (buf, ctx) => P.adjustExposure(buf, ctx.param('ev', 40)),
    params: [{ key: 'ev', label: 'EV', zh: '曝光值', min: -100, max: 100, step: 1, def: 40 }],
  },
  {
    id: 'invert', label: 'Invert', zh: '反相', category: 'Adjust', mode: 'ascii',
    prim: (buf) => { for (let i = 0; i < buf.length; i += 4) { buf[i] = 255 - buf[i]; buf[i + 1] = 255 - buf[i + 1]; buf[i + 2] = 255 - buf[i + 2] } },
    params: [],
  },
  {
    id: 'heavyink', label: 'Heavy Ink', zh: '重墨', category: 'Ink', mode: 'ascii',
    prim: (buf) => {
      for (let i = 0; i < buf.length; i += 4) {
        const l = P.lumOf(buf[i], buf[i + 1], buf[i + 2])
        const k = l < 0.5 ? 0 : l < 0.8 ? 0.35 : 1
        buf[i] = k * 20; buf[i + 1] = k * 18; buf[i + 2] = k * 16
      }
    },
    params: [],
  },
  {
    id: 'detail', label: 'Detail', zh: '细节', category: 'Sharpen', mode: 'ascii',
    prim: (buf, ctx) => P.convolve(buf, ctx.w, ctx.h, [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]),
    params: [],
  },
  {
    id: 'line', label: 'Line', zh: '线条', category: 'Glyph', mode: 'ascii',
    rampOverride: '─│┌┐└┘├┤┬┴┼╴╵╶╷',
    prim: (buf) => P.duotone(buf, [10, 12, 18], [180, 220, 255]),
    params: [],
  },
  {
    id: 'symbol', label: 'Symbol', zh: '符号', category: 'Glyph', mode: 'ascii',
    rampOverride: SYMBOLS,
    prim: (buf) => P.duotone(buf, [16, 12, 28], [255, 200, 90]),
    params: [],
  },
  {
    id: 'letter', label: 'Letter', zh: '字母', category: 'Glyph', mode: 'ascii',
    rampOverride: LETTERS,
    prim: (buf) => P.duotone(buf, [14, 16, 22], [120, 230, 255]),
    params: [],
  },
  {
    id: 'digit', label: 'Digit', zh: '数字', category: 'Glyph', mode: 'ascii',
    rampOverride: DIGITS,
    prim: (buf) => P.duotone(buf, [10, 16, 14], [80, 255, 180]),
    params: [],
  },
  {
    id: 'irregular', label: 'Irregular', zh: '不规则', category: 'Glyph', mode: 'ascii',
    rampOverride: IRREGULAR,
    prim: (buf) => P.duotone(buf, [18, 10, 24], [220, 100, 255]),
    params: [],
  },
  {
    id: 'distort', label: 'Distort', zh: '扭曲', category: 'Distort', mode: 'mosaic', geometric: true,
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const amt = ctx.param('amt', 12) * (0.5 + ctx.strength)
      const src = dup(buf)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = x + Math.sin(y / 24) * amt
          const ny = y + Math.cos(x / 24) * amt
          const [r, g, b, a] = P.sampleNearest(src, w, h, nx, ny)
          const i = (y * w + x) * 4
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a
        }
      }
    },
    params: [{ key: 'amt', label: 'Amount', zh: '强度', min: 0, max: 40, step: 1, def: 12 }],
  },
  {
    id: 'crease', label: 'Crease', zh: '折痕', category: 'Distort', mode: 'ascii',
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      for (let y = 0; y < h; y++) {
        const fold = Math.sin(y / 30) * 60
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const d = Math.abs((y % 60) - 30)
          const f = d < 4 ? 1 : 1 - d / 60 * 0.3
          buf[i] = buf[i] * f + fold * 0.2
          buf[i + 1] = buf[i + 1] * f + fold * 0.2
          buf[i + 2] = buf[i + 2] * f + fold * 0.2
        }
      }
    },
    params: [],
  },
  {
    id: 'wrinkle', label: 'Wrinkle', zh: '褶皱', category: 'Distort', mode: 'ascii',
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const wr = (Math.sin(x / 18 + y / 40) + Math.cos(y / 13 - x / 30)) * 18
          buf[i] += wr; buf[i + 1] += wr; buf[i + 2] += wr
        }
      }
    },
    params: [],
  },
  {
    id: 'cohesion', label: 'Cohesion', zh: '黏连', category: 'Distort', mode: 'mosaic',
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const cell = Math.max(4, Math.round(ctx.param('cell', 10)))
      const src = dup(buf)
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const [r, g, b] = P.sampleNearest(src, w, h, x + cell / 2, y + cell / 2)
          for (let yy = 0; yy < cell && y + yy < h; yy++)
            for (let xx = 0; xx < cell && x + xx < w; xx++) {
              const i = ((y + yy) * w + (x + xx)) * 4
              buf[i] = r; buf[i + 1] = g; buf[i + 2] = b
            }
        }
      }
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 4, max: 28, step: 1, def: 10 }],
  },
  {
    id: 'scatter', label: 'Scatter', zh: '散射', category: 'Distort', mode: 'mosaic', geometric: true,
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const amt = ctx.param('amt', 10) * (0.5 + ctx.strength)
      const src = dup(buf)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ox = (ctx.rng() - 0.5) * amt
          const oy = (ctx.rng() - 0.5) * amt
          const [r, g, b, a] = P.sampleNearest(src, w, h, x + ox, y + oy)
          const i = (y * w + x) * 4
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a
        }
      }
    },
    params: [{ key: 'amt', label: 'Amount', zh: '强度', min: 0, max: 30, step: 1, def: 10 }],
  },
  {
    id: 'spread', label: 'Spread', zh: '散布', category: 'Distort', mode: 'ascii',
    prim: (buf, ctx) => { P.blur(buf, ctx.w, ctx.h, 1); P.addGrain(buf, 25, ctx.rng, false) },
    params: [],
  },
  {
    id: 'cover', label: 'Cover', zh: '覆盖', category: 'Distort', mode: 'mosaic',
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const cell = Math.max(4, Math.round(ctx.param('cell', 9)))
      const src = dup(buf)
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const [r, g, b] = P.sampleNearest(src, w, h, x, y)
          for (let yy = 0; yy < cell && y + yy < h; yy++)
            for (let xx = 0; xx < cell && x + xx < w; xx++) {
              const i = ((y + yy) * w + (x + xx)) * 4
              buf[i] = r; buf[i + 1] = g; buf[i + 2] = b
            }
        }
      }
    },
    params: [{ key: 'cell', label: 'Cell', zh: '格子', min: 4, max: 24, step: 1, def: 9 }],
  },
  {
    id: 'stretch', label: 'Stretch', zh: '拉伸', category: 'Transform', mode: 'mosaic', geometric: true,
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const sy = ctx.param('sy', 150) / 100
      const nh = Math.max(1, Math.round(h / sy))
      const out = P.rebuild(w, nh, (x, y) => P.sampleNearest(buf, w, h, x, y * sy))
      buf.set(out.subarray(0, Math.min(buf.length, out.length)))
    },
    params: [{ key: 'sy', label: 'Vertical %', zh: '纵向%', min: 50, max: 200, step: 5, def: 150 }],
  },
  {
    id: 'skew', label: 'Skew', zh: '斜切', category: 'Transform', mode: 'mosaic', geometric: true,
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const k = ctx.param('k', 20) / 100
      const out = P.rebuild(w, h, (x, y) => P.sampleNearest(buf, w, h, x - y * k, y))
      buf.set(out)
    },
    params: [{ key: 'k', label: 'Skew', zh: '斜切量', min: -60, max: 60, step: 1, def: 20 }],
  },
  {
    id: 'scale', label: 'Scale', zh: '缩放', category: 'Transform', mode: 'mosaic', geometric: true,
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const s = ctx.param('s', 130) / 100
      const nw = Math.max(1, Math.round(w / s))
      const nh = Math.max(1, Math.round(h / s))
      const out = P.rebuild(nw, nh, (x, y) => P.sampleNearest(buf, w, h, x * s, y * s))
      buf.set(out.subarray(0, Math.min(buf.length, out.length)))
    },
    params: [{ key: 's', label: 'Scale %', zh: '缩放%', min: 50, max: 200, step: 5, def: 130 }],
  },
  {
    id: 'rotate', label: 'Rotate', zh: '旋转', category: 'Transform', mode: 'mosaic', geometric: true,
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const ang = (ctx.param('deg', 90) * Math.PI) / 180
      const cos = Math.cos(ang), sin = Math.sin(ang)
      const cx = w / 2, cy = h / 2
      const out = P.rebuild(w, h, (x, y) => {
        const dx = x - cx, dy = y - cy
        const fx = cx + dx * cos - dy * sin
        const fy = cy + dx * sin + dy * cos
        return P.sampleNearest(buf, w, h, fx, fy)
      })
      buf.set(out)
    },
    params: [{ key: 'deg', label: 'Degrees', zh: '角度', min: -180, max: 180, step: 5, def: 90 }],
  },
  {
    id: 'offset', label: 'Offset', zh: '偏移', category: 'Transform', mode: 'mosaic', geometric: true,
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const ox = ctx.param('ox', 30)
      const oy = ctx.param('oy', 0)
      const out = P.rebuild(w, h, (x, y) => P.sampleNearest(buf, w, h, x + ox, y + oy))
      buf.set(out)
    },
    params: [
      { key: 'ox', label: 'Offset X', zh: '偏移X', min: -100, max: 100, step: 1, def: 30 },
      { key: 'oy', label: 'Offset Y', zh: '偏移Y', min: -100, max: 100, step: 1, def: 0 },
    ],
  },
  {
    id: 'hole', label: 'Hole', zh: '孔洞', category: 'Distort', mode: 'ascii',
    prim: (buf, ctx) => {
      const w = ctx.w, h = ctx.h
      const cx = w / 2, cy = h / 2
      const rmax = Math.min(w, h) / 2
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
          if (d > rmax * 0.6 && d < rmax) {
            const i = (y * w + x) * 4
            buf[i] = 10; buf[i + 1] = 10; buf[i + 2] = 12
          }
        }
      }
    },
    params: [],
  },
  {
    id: 'coarsegrain', label: 'Coarse Grain', zh: '粗颗粒', category: 'Grain', mode: 'ascii',
    prim: (buf, ctx) => P.addGrain(buf, 70, ctx.rng, true),
    params: [],
  },
  {
    id: 'finegrain', label: 'Fine Grain', zh: '细颗粒', category: 'Grain', mode: 'ascii',
    prim: (buf, ctx) => P.addGrain(buf, 35, ctx.rng, false),
    params: [],
  },
  {
    id: 'rough', label: 'Rough', zh: '粗犷', category: 'Grain', mode: 'ascii',
    prim: (buf, ctx) => { P.addGrain(buf, 50, ctx.rng, true); P.blur(buf, ctx.w, ctx.h, 1) },
    params: [],
  },
]

export const SHADER_MAP: Record<PrimId, ShaderDef> = Object.fromEntries(
  SHADERS.map((s) => [s.id, s]),
) as Record<PrimId, ShaderDef>

export const SHADER_CATEGORIES = (() => {
  const map: Record<string, ShaderDef[]> = {}
  for (const s of SHADERS) (map[s.category] ??= []).push(s)
  return map
})()

export { cmykColor }
