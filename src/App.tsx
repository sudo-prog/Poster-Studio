import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import {
  CHARSETS,
  DEFAULT_STATE,
} from './lib/ascii'
import type {
  EditorState,
  PrimId,
  CharsetId,
  Layer,
  TextLayer,
  LayersState,
} from './lib/types'
import { SHADERS, SHADER_MAP, SHADER_CATEGORIES } from './lib/shaders'
import { compositePoster } from './lib/render'
import { History } from './lib/history'
import {
  makeAsciiLayer,
  makeTextLayer,
  makeImageLayer,
  getSelected,
  addLayer,
  removeLayer,
  toggleVisible,
  selectLayer,
  updateLayerProps,
  updateLayerTransform,
  setOpacity,
  reorder,
} from './lib/layers'
import { loadFontFile, getUploadedFonts, subscribeFonts, SYSTEM_FONTS } from './lib/fonts'
import { t, type Lang } from './lib/i18n'
import { SAMPLES } from './App.samples'

// ---- export-code template generator ----
function buildExportHtml(opts: EditorState, layers: LayersState): string {
  return `<!-- Poster Studio export — self-contained ASCII poster config -->
<!doctype html>
<html><head><meta charset="utf-8"><title>Poster Studio Export</title>
<style>body{margin:0;background:#0f1117;display:grid;place-items:center;min-height:100vh}
pre{font-family:'Courier New',monospace;color:${opts.appearance.fgColor};background:${opts.appearance.bgColor};padding:16px;white-space:pre;overflow:auto;max-width:96vw;line-height:1}</style>
</head><body><pre id="art">Paste your source image to render.</pre>
<script>
// Editor + layers state:
const STATE = ${JSON.stringify(opts, null, 2)};
const LAYERS = ${JSON.stringify(layers, null, 2)};
console.log('Poster Studio state', STATE, LAYERS);
// Render by dropping an image onto the page — see compositePoster() in the app.
</script></body></html>`
}

function buildReactSnippet(opts: EditorState, layers: LayersState): string {
  return `// Drop into your React project (Poster Studio config)
import { DEFAULT_STATE } from './lib/ascii'
import type { EditorState, LayersState } from './lib/types'

export const myPreset: EditorState = ${JSON.stringify(opts, null, 2)}
export const myLayers: LayersState = ${JSON.stringify(layers, null, 2)}

// <PosterStudio initialState={myPreset} initialLayers={myLayers} />`
}

export default function App() {
  const [opts, setOpts] = useState<EditorState>(DEFAULT_STATE)
  const [layers, setLayers] = useState<LayersState>(() => ({
    layers: [makeAsciiLayer()],
    selectedId: null,
  }))
  const [srcImg, setSrcImg] = useState<HTMLCanvasElement | null>(null)
  const [srcUrl, setSrcUrl] = useState<string | null>(null)
  const [imageLayerCanvas, setImageLayerCanvas] = useState<HTMLCanvasElement | null>(null)
  const [outUrl, setOutUrl] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [lang, setLang] = useState<Lang>('en')
  const [panel, setPanel] = useState<'none' | 'layers' | 'charsel' | 'shaderlist' | 'shaderparams' | 'appearance' | 'adjust' | 'transform' | 'presets'>('none')
  const [activeShaderCat, setActiveShaderCat] = useState<string>('Base')
  const [showCode, setShowCode] = useState(false)
  const [codeText, setCodeText] = useState('')
  const [copied, setCopied] = useState(false)
  const [previewOriginal, setPreviewOriginal] = useState(false)
  const [fontTick, setFontTick] = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<HTMLInputElement>(null)
  const fontFileRef = useRef<HTMLInputElement>(null)
  const outCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const historyRef = useRef(new History())
  const [, forceHist] = useState(0)

  const T = (k: string) => t(lang, k)

  // ---- state mutation plumbing with undo ----
  const update = useCallback(
    (mut: (o: EditorState) => EditorState, label: string) => {
      setOpts((prev) => {
        const next = mut(prev)
        historyRef.current.push(prev, label)
        return next
      })
    },
    [],
  )

  const setK = <K extends keyof EditorState>(k: K, v: EditorState[K], label = k as string) =>
    update((o) => ({ ...o, [k]: v }), label)

  // nested setters
  const setCharsetParams = (k: keyof EditorState['charsetParams'], v: number | string) =>
    update((o) => ({ ...o, charsetParams: { ...o.charsetParams, [k]: v } }), 'charset:' + k)
  const setTransform = (k: keyof EditorState['transform'], v: number) =>
    update((o) => ({ ...o, transform: { ...o.transform, [k]: v } }), 'transform:' + k)
  const setAppearance = (k: keyof EditorState['appearance'], v: number | string | boolean) =>
    update((o) => ({ ...o, appearance: { ...o.appearance, [k]: v } }), 'appearance:' + k)
  const setAdjust = (k: keyof EditorState['adjust'], v: number) =>
    update((o) => ({ ...o, adjust: { ...o.adjust, [k]: v } }), 'adjust:' + k)
  const setShaderParam = (k: string, v: number) =>
    update((o) => ({ ...o, shaderParams: { ...o.shaderParams, [k]: v } }), 'shader:' + k)

  // --- layers mutations (with undo) ---
  const updateLayers = useCallback(
    (mut: (s: LayersState) => LayersState, _label: string) => {
      setLayers((prev) => mut(prev))
    },
    [],
  )

  const undo = useCallback(() => {
    setOpts((cur) => {
      const restored = historyRef.current.undo(cur)
      return restored ?? cur
    })
    forceHist((n) => n + 1)
  }, [])
  const redo = useCallback(() => {
    setOpts((cur) => {
      const restored = historyRef.current.redo(cur)
      return restored ?? cur
    })
    forceHist((n) => n + 1)
  }, [])

  const hist = historyRef.current
  const canUndo = hist.canUndo()
  const canRedo = hist.canRedo()

  // ---- image loading ----
  const loadFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const cv = document.createElement('canvas')
      const max = 1000
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      cv.width = Math.round(img.width * scale)
      cv.height = Math.round(img.height * scale)
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
      setSrcImg(cv)
      setSrcUrl(url)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [])

  const loadImageLayer = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const cv = document.createElement('canvas')
      cv.width = img.naturalWidth
      cv.height = img.naturalHeight
      cv.getContext('2d')!.drawImage(img, 0, 0)
      setImageLayerCanvas(cv)
      // ensure there is an image layer
      setLayers((prev) => {
        if (prev.layers.some((l) => l.type === 'image')) return prev
        return addLayer(prev, makeImageLayer())
      })
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [])

  const loadSample = useCallback((id: string) => {
    const s = SAMPLES.find((x) => x.id === id)
    if (!s) return
    const cv = document.createElement('canvas')
    cv.width = 600; cv.height = 600
    s.draw(cv)
    setSrcImg(cv)
    setSrcUrl(null)
  }, [])

  // paste from clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          const f = it.getAsFile()
          if (f) loadFile(f)
          e.preventDefault()
          return
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFile])

  useEffect(() => subscribeFonts(() => setFontTick((n) => n + 1)), [])

  // ---- render (compositor) ----
  const renderTimer = useRef<number | undefined>(undefined)
  const outDims = useRef<{ w: number; h: number }>({ w: 600, h: 600 })
  useEffect(() => {
    window.clearTimeout(renderTimer.current)
    renderTimer.current = window.setTimeout(() => {
      const { canvas } = compositePoster(srcImg, opts, layers.layers, imageLayerCanvas)
      outCanvasRef.current = canvas
      outDims.current = { w: canvas.width, h: canvas.height }
      setOutUrl(canvas.toDataURL('image/png'))
    }, 40)
    return () => window.clearTimeout(renderTimer.current)
  }, [srcImg, imageLayerCanvas, opts, layers, previewOriginal, fontTick])

  const save = useCallback(() => {
    if (!outCanvasRef.current) return
    const a = document.createElement('a')
    a.href = outCanvasRef.current.toDataURL('image/png')
    a.download = `poster-${opts.charsetId}-${opts.shaderId}.png`
    a.click()
  }, [opts])

  // ---- presets / random ----
  const PRESETS = useMemo(() => [
    { id: 'none', label: lang === 'zh' ? '默认' : 'Default' },
    { id: 'bold', label: lang === 'zh' ? '粗体' : 'Bold' },
    { id: 'soft', label: lang === 'zh' ? '柔和' : 'Soft' },
    { id: 'neon', label: lang === 'zh' ? '霓虹' : 'Neon' },
    { id: 'paper', label: lang === 'zh' ? '纸张' : 'Paper' },
  ], [lang])

  const applyPreset = (id: string) => {
    update((o) => {
      const base = { ...o }
      if (id === 'bold') {
        base.shaderId = 'heavyink'; base.appearance = { ...base.appearance, fgColor: '#ffffff', filterStrength: 100 }
        base.adjust = { ...base.adjust, contrast: 150, brightness: 105 }
        base.charsetParams = { ...base.charsetParams, charSize: 13 }
      } else if (id === 'soft') {
        base.shaderId = 'blur'; base.adjust = { ...base.adjust, brightness: 108, contrast: 92 }
      } else if (id === 'neon') {
        base.shaderId = 'neon'; base.appearance = { ...base.appearance, bgColor: '#0f051e', fgColor: '#ff28c8' }
      } else if (id === 'paper') {
        base.shaderId = 'cotton'; base.appearance = { ...base.appearance, bgColor: '#f4ecd8', fgColor: '#2b2620', includeBackground: true }
      } else {
        return { ...DEFAULT_STATE }
      }
      base.presetId = id
      return base
    }, 'preset:' + id)
  }

  const randomize = () => {
    update((o) => {
      const seed = Math.floor(Math.random() * 9999) + 1
      const shaders: PrimId[] = SHADERS.map((s) => s.id)
      const sid = shaders[Math.floor(Math.random() * shaders.length)]
      const cs = CHARSETS[Math.floor(Math.random() * CHARSETS.length)].id as CharsetId
      return {
        ...o,
        shaderId: sid,
        charsetId: cs,
        randomSeed: seed,
        presetId: 'none',
        transform: {
          rotation: Math.round((Math.random() - 0.5) * 40),
          offsetX: Math.round((Math.random() - 0.5) * 30),
          offsetY: Math.round((Math.random() - 0.5) * 30),
          scale: 100,
          skew: Math.round((Math.random() - 0.5) * 20),
          stretch: 100 + Math.round((Math.random() - 0.5) * 30),
          distort: Math.round((Math.random() - 0.5) * 20),
        },
        appearance: { ...o.appearance, filterStrength: 70 + Math.floor(Math.random() * 30) },
        charsetParams: { ...o.charsetParams, charSize: 8 + Math.floor(Math.random() * 10), charDensity: 60 + Math.floor(Math.random() * 40) },
      }
    }, 'random')
  }

  const resetPreset = () => applyPreset('none')
  const resetTransform = () => update((o) => ({
    ...o, transform: { rotation: 0, offsetX: 0, offsetY: 0, scale: 100, skew: 0, stretch: 100, distort: 0 },
  }), 'reset-transform')
  const resetLayout = () => updateLayers((s) =>
    ({ ...s, layers: s.layers.map((l) => ({ ...l, transform: { x: 0, y: 0, scale: 1, rotation: 0 } })) }), 'reset-layout')

  const selectCharset = (id: CharsetId) => setK('charsetId', id, 'charset')
  const selectShader = (id: PrimId) => {
    update((o) => ({ ...o, shaderId: id }), 'shader:' + id)
    const def = SHADER_MAP[id]
    if (def.params.length === 0) setPanel('shaderlist')
    else setPanel('shaderparams')
  }

  const copyCode = (kind: 'self' | 'react') => {
    const txt = kind === 'self' ? buildExportHtml(opts, layers) : buildReactSnippet(opts, layers)
    setCodeText(txt)
    navigator.clipboard?.writeText(txt).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    })
  }

  const openCode = (kind: 'self' | 'react') => {
    setCodeText(kind === 'self' ? buildExportHtml(opts, layers) : buildReactSnippet(opts, layers))
    setShowCode(true)
  }

  // ---------- Layers actions ----------
  const addText = () => updateLayers((s) => addLayer(s, makeTextLayer(lang === 'zh' ? '海报' : 'Poster')), 'add-text')
  const addImage = () => imageFileRef.current?.click()
  const onAddImageFile = (file: File | undefined) => { if (file) loadImageLayer(file) }

  const sel = getSelected(layers)
  const selectedText = sel && sel.type === 'text' ? (sel as TextLayer) : null

  const setTextProp = (patch: Partial<TextLayer['props']>) => {
    if (!sel || sel.type !== 'text') return
    updateLayers((s) => updateLayerProps(s, sel.id, patch), 'text:' + Object.keys(patch).join(','))
  }
  const setSelectedTransform = (patch: Partial<Layer['transform']>) => {
    if (!sel) return
    updateLayers((s) => updateLayerTransform(s, sel.id, patch), 'tf:' + Object.keys(patch).join(','))
  }
  const setSelectedOpacity = (opacity: number) => {
    if (!sel) return
    updateLayers((s) => setOpacity(s, sel.id, opacity), 'opacity')
  }
  const onUploadFont = (file: File | undefined) => {
    if (!file) return
    loadFontFile(file).then((res) => {
      if (res.ok && res.font && selectedText) {
        setTextProp({ fontFamily: `'${res.font.family}', ${SYSTEM_FONTS[0].family}` })
      }
    })
  }

  // ---------- Canvas drag / pinch (Tasks B & C) ----------
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const canvasWrapRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null)

  const ptToCanvas = (clientX: number, clientY: number) => {
    const wrap = canvasWrapRef.current
    const img = wrap?.querySelector('img')
    if (!wrap || !img) return { x: 0, y: 0, rect: { left: 0, top: 0, w: 1, h: 1 } }
    const r = img.getBoundingClientRect()
    return { x: clientX - r.left, y: clientY - r.top, rect: { left: r.left, top: r.top, w: r.width, h: r.height } }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!sel) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const p = ptToCanvas(e.clientX, e.clientY)
    // locate layer center in screen space
    const rect = p.rect
    const cx = rect.w / 2
    const cy = rect.h / 2
    const baseW = outDims.current.w || 600
    const baseH = outDims.current.h || 600
    const layerCx = cx + sel.transform.x * (rect.w / baseW)
    const layerCy = cy + sel.transform.y * (rect.h / baseH)
    const dist = Math.hypot(p.x - layerCx, p.y - layerCy)
    if (dist < 60 && pointers.current.size === 1) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, origX: sel.transform.x, origY: sel.transform.y }
      if (canvasWrapRef.current) canvasWrapRef.current.style.touchAction = 'none'
    }
    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values())
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      pinchRef.current = { startDist: d, startScale: sel.transform.scale }
      dragRef.current = null
      if (canvasWrapRef.current) canvasWrapRef.current.style.touchAction = 'none'
    }
    if (sel.type === 'text') setPreviewOriginal(false)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!sel) return
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const rect = ptToCanvas(e.clientX, e.clientY).rect
    const scaleToCanvas = rect.w / 600
    if (pointers.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointers.current.values())
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const ns = clamp(pinchRef.current.startScale * (d / pinchRef.current.startDist), 0.1, 8)
      setSelectedTransform({ scale: ns })
      return
    }
    if (dragRef.current) {
      const dx = (e.clientX - dragRef.current.startX) / scaleToCanvas
      const dy = (e.clientY - dragRef.current.startY) / scaleToCanvas
      setSelectedTransform({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchRef.current = null
    if (pointers.current.size === 0) {
      dragRef.current = null
      if (canvasWrapRef.current) canvasWrapRef.current.style.touchAction = ''
    }
  }

  const slider = (
    label: string,
    min: number,
    max: number,
    value: number,
    onChange: (v: number) => void,
    suffix = '',
  ) => (
    <div className="slider" key={label}>
      <label>{label}<b>{Math.round(value)}{suffix}</b></label>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )

  const activeDef: import('./lib/types').ShaderDef = SHADER_MAP[opts.shaderId]

  return (
    <div className="app">
      {/* Banner */}
      <header className="banner">
        <div className="brand">
          <h1>{T('appTitle')}</h1>
          <span className="brand-sub">{T('tagline')}</span>
        </div>
        <div className="banner-actions">
          <button className="btn" onClick={() => fileRef.current?.click()}>{T('inputImage')}</button>
          <button className="btn primary" disabled={!outUrl} onClick={save}>{T('saveImage')}</button>
        </div>
      </header>

      <main className="main">
        {/* Upload */}
        <div
          className={`drop ${drag ? 'drag' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault(); setDrag(false)
            const f = e.dataTransfer.files?.[0]
            if (f) loadFile(f)
          }}
        >
          <span className="drop-icon">＋</span>
          <strong>{T('uploadHint')}</strong>
          <span className="drop-sub">{T('uploadSub')}</span>
          <input
            ref={fileRef} type="file" accept="image/*,.svg" hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) loadFile(f)
            }}
          />
        </div>

        {/* Samples */}
        <div className="samples">
          {SAMPLES.map((s) => (
            <button key={s.id} className="sample-btn" onClick={() => loadSample(s.id)}>{s.label}</button>
          ))}
        </div>

        {/* Output preview (long-press -> original) */}
        <div
          ref={canvasWrapRef}
          className="canvas-wrap"
          onPointerDown={(e) => { if (srcUrl && sel) setPreviewOriginal(true); onPointerDown(e) }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={(e) => { setPreviewOriginal(false); onPointerUp(e) }}
          title={T('holdOriginal')}
        >
          {outUrl ? (
            <img
              src={previewOriginal && srcUrl ? srcUrl : outUrl}
              alt="ASCII poster preview"
              draggable={false}
            />
          ) : (
            <div className="placeholder">{T('uploadHint')}</div>
          )}
        </div>

        {/* Layers rail button */}
        <div className="rail">
          <button className={`rail-btn ${panel === 'layers' ? 'on' : ''}`} onClick={() => setPanel('layers')}>{T('layers')}</button>
          <button className={`rail-btn ${panel === 'shaderlist' ? 'on' : ''}`} onClick={() => { setActiveShaderCat('Base'); setPanel('shaderlist') }}>{T('shaderList')}</button>
          <button className={`rail-btn ${panel === 'appearance' ? 'on' : ''}`} onClick={() => setPanel('appearance')}>{T('appearance')}</button>
          <button className={`rail-btn ${panel === 'adjust' ? 'on' : ''}`} onClick={() => setPanel('adjust')}>{T('adjust')}</button>
          <button className={`rail-btn ${panel === 'transform' ? 'on' : ''}`} onClick={() => setPanel('transform')}>{T('transform')}</button>
          <button className={`rail-btn ${panel === 'presets' ? 'on' : ''}`} onClick={() => setPanel('presets')}>{T('presets')}</button>
          <button className={`rail-btn ${panel === 'charsel' ? 'on' : ''}`} onClick={() => setPanel('charsel')}>{T('charset')}</button>
        </div>

        {/* ---- Layers panel ---- */}
        {panel === 'layers' && (
          <div className="panel">
            <div className="panel-head">
              <span>{T('layers')}</span>
              <button className="btn small" onClick={resetLayout}>{T('resetTransform')}</button>
            </div>
            <div className="row-gap">
              <button className="btn" onClick={addText}>{T('addText')}</button>
              <button className="btn" onClick={addImage}>{T('addImage')}</button>
            </div>
            <input
              ref={imageFileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; onAddImageFile(f) }}
            />

            {layers.layers.length === 0 && (
              <div className="no-params">{T('noLayer')}</div>
            )}

            <div className="layer-list">
              {/* top of list = top z-order */}
              {[...layers.layers].reverse().map((l) => (
                <div
                  key={l.id}
                  className={`layer-row ${layers.selectedId === l.id ? 'active' : ''}`}
                  onClick={() => updateLayers((s) => selectLayer(s, l.id), 'select')}
                >
                  <button
                    className="icon-btn"
                    title={T('visible')}
                    onClick={(e) => { e.stopPropagation(); updateLayers((s) => toggleVisible(s, l.id), 'visible') }}
                  >{l.visible ? '👁' : '🚫'}</button>
                  <div className="layer-name">{l.name}</div>
                  <div className="layer-actions">
                    <button className="icon-btn" title={T('bringUp')} onClick={(e) => { e.stopPropagation(); updateLayers((s) => reorder(s, l.id, 'up'), 'up') }}>↑</button>
                    <button className="icon-btn" title={T('sendDown')} onClick={(e) => { e.stopPropagation(); updateLayers((s) => reorder(s, l.id, 'down'), 'down') }}>↓</button>
                    <button className="icon-btn" title={T('delete')} onClick={(e) => { e.stopPropagation(); updateLayers((s) => removeLayer(s, l.id), 'delete') }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected layer editor */}
            {sel && (
              <div className="layer-edit">
                <div className="group-label">{T('layer')}: {sel.name}</div>
                {slider(T('opacity'), 0, 100, sel.opacity, setSelectedOpacity, '%')}
                {slider(T('move') + ' X', -600, 600, Math.round(sel.transform.x), (v) => setSelectedTransform({ x: v }))}
                {slider(T('move') + ' Y', -600, 600, Math.round(sel.transform.y), (v) => setSelectedTransform({ y: v }))}
                {slider(T('resize'), 10, 800, Math.round(sel.transform.scale * 100), (v) => setSelectedTransform({ scale: v / 100 }), '%')}
                {slider(T('rotation') + ' Z', -180, 180, Math.round(sel.transform.rotation), (v) => setSelectedTransform({ rotation: v }), '°')}

                {sel.type === 'text' && selectedText && (
                  <>
                    <textarea
                      className="text-area"
                      value={selectedText.props.text}
                      onChange={(e) => setTextProp({ text: e.target.value })}
                      placeholder={T('textContent')}
                    />
                    <div className="row-gap">
                      <select
                        className="select"
                        value={selectedText.props.fontFamily}
                        onChange={(e) => setTextProp({ fontFamily: e.target.value })}
                      >
                        {SYSTEM_FONTS.map((f) => (
                          <option key={f.label} value={f.family}>{f.label}</option>
                        ))}
                        {getUploadedFonts().map((f) => (
                          <option key={f.family} value={`'${f.family}', ${SYSTEM_FONTS[0].family}`}>{f.label} (custom)</option>
                        ))}
                      </select>
                      <button className="btn small" onClick={() => fontFileRef.current?.click()}>{T('uploadFont')}</button>
                      <input
                        ref={fontFileRef} type="file" accept=".ttf,.otf,.woff,.woff2" hidden
                        onChange={(e) => onUploadFont(e.target.files?.[0])}
                      />
                    </div>
                    <div className="row-gap">
                      <label className="toggle-row"><span>{T('bold')}</span>
                        <input type="checkbox" checked={selectedText.props.bold} onChange={(e) => setTextProp({ bold: e.target.checked })} /></label>
                      <label className="toggle-row"><span>{T('italic')}</span>
                        <input type="checkbox" checked={selectedText.props.italic} onChange={(e) => setTextProp({ italic: e.target.checked })} /></label>
                    </div>
                    {slider(T('fontSize'), 8, 400, selectedText.props.fontSize, (v) => setTextProp({ fontSize: v }))}
                    <div className="color-row">
                      <label>{T('fillColor')}</label>
                      <input type="color" value={selectedText.props.fill} onChange={(e) => setTextProp({ fill: e.target.value })} />
                    </div>
                    <label className="toggle-row"><span>{T('stroke')}</span>
                      <input type="checkbox" checked={selectedText.props.strokeEnabled} onChange={(e) => setTextProp({ strokeEnabled: e.target.checked })} /></label>
                    {selectedText.props.strokeEnabled && (
                      <>
                        <div className="color-row">
                          <label>{T('strokeColor')}</label>
                          <input type="color" value={selectedText.props.strokeColor} onChange={(e) => setTextProp({ strokeColor: e.target.value })} />
                        </div>
                        {slider(T('strokeWidth'), 0, 40, selectedText.props.strokeWidth, (v) => setTextProp({ strokeWidth: v }))}
                      </>
                    )}
                    <label className="toggle-row"><span>{T('dropShadow')}</span>
                      <input type="checkbox" checked={selectedText.props.shadowEnabled} onChange={(e) => setTextProp({ shadowEnabled: e.target.checked })} /></label>
                    {selectedText.props.shadowEnabled && (
                      <>
                        <div className="color-row">
                          <label>{T('shadowColor')}</label>
                          <input type="color" value={selectedText.props.shadowColor} onChange={(e) => setTextProp({ shadowColor: e.target.value })} />
                        </div>
                        {slider(T('shadowBlur'), 0, 60, selectedText.props.shadowBlur, (v) => setTextProp({ shadowBlur: v }))}
                        {slider(T('shadowX'), -60, 60, selectedText.props.shadowX, (v) => setTextProp({ shadowX: v }))}
                        {slider(T('shadowY'), -60, 60, selectedText.props.shadowY, (v) => setTextProp({ shadowY: v }))}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            {!sel && <div className="no-params">{T('selectLayer')}</div>}
          </div>
        )}

        {/* Charset group */}
        <section className="control-group">
          <div className="group-label">{T('charset')}</div>
          <div className="chip-list charset-list">
            {CHARSETS.map((c) => (
              <button
                key={c.id}
                className={`chip ${opts.charsetId === c.id ? 'active' : ''}`}
                onClick={() => selectCharset(c.id)}
              >
                <span className="glyph">@#</span>
                <span className="chip-label">{lang === 'zh' ? c.zh : c.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Active shader + open list */}
        <section className="control-group">
          <div className="group-label">{T('shaderList')}</div>
          <div className="active-row">
            <span className="active-chip">@# {lang === 'zh' ? activeDef.zh : activeDef.label}</span>
            <button className="btn small" onClick={() => { setActiveShaderCat('Base'); setPanel('shaderlist') }}>{T('expandList')}</button>
          </div>
        </section>

        {/* ---- Panels ---- */}
        {panel === 'charsel' && (
          <div className="panel">
            <div className="group-label">{T('charset')}</div>
            {slider(T('charSize'), 4, 28, opts.charsetParams.charSize, (v) => setCharsetParams('charSize', v))}
            {slider(T('charDensity'), 20, 100, opts.charsetParams.charDensity, (v) => setCharsetParams('charDensity', v), '%')}
            <div className="color-row">
              <label>{T('charColor')}</label>
              <input type="color" value={opts.charsetParams.charColor} onChange={(e) => setCharsetParams('charColor', e.target.value)} />
            </div>
          </div>
        )}

        {panel === 'shaderlist' && (
          <div className="panel">
            <div className="cat-tabs">
              {Object.keys(SHADER_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  className={`cat-tab ${activeShaderCat === cat ? 'on' : ''}`}
                  onClick={() => setActiveShaderCat(cat)}
                >{cat}</button>
              ))}
            </div>
            <div className="shader-grid">
              {SHADER_CATEGORIES[activeShaderCat]?.map((s) => (
                <button
                  key={s.id}
                  className={`shader-cell ${opts.shaderId === s.id ? 'active' : ''}`}
                  onClick={() => selectShader(s.id)}
                >
                  <span className="shader-en">{s.label}</span>
                  <span className="shader-zh">{s.zh}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {panel === 'shaderparams' && (
          <div className="panel">
            <div className="panel-head">
              <span>{lang === 'zh' ? activeDef.zh : activeDef.label}</span>
              <button className="btn small" onClick={() => setPanel('shaderlist')}>← {T('backToList')}</button>
            </div>
            <div className="group-label">{T('paramConfig')}</div>
            {activeDef.params.length === 0 ? (
              <div className="no-params">{lang === 'zh' ? '该 shader 暂无可配置参数' : T('noParams')}</div>
            ) : (
              activeDef.params.map((p) =>
                slider(
                  lang === 'zh' ? p.zh : p.label,
                  p.min, p.max,
                  opts.shaderParams[p.key] ?? p.def,
                  (v) => setShaderParam(p.key, v),
                ),
              )
            )}
          </div>
        )}

        {panel === 'appearance' && (
          <div className="panel">
            <div className="group-label">{T('appearance')}</div>
            <div className="color-row">
              <label>{T('bgColor')}</label>
              <input type="color" value={opts.appearance.bgColor} onChange={(e) => setAppearance('bgColor', e.target.value)} />
            </div>
            <div className="color-row">
              <label>{T('fgColor')}</label>
              <input type="color" value={opts.appearance.fgColor} onChange={(e) => setAppearance('fgColor', e.target.value)} />
            </div>
            <div className="toggle-row">
              <span>{T('includeBg')}</span>
              <input type="checkbox" checked={opts.appearance.includeBackground} onChange={(e) => setAppearance('includeBackground', e.target.checked)} />
            </div>
            <div className="toggle-row">
              <span>{T('origColor')}</span>
              <input type="checkbox" checked={opts.appearance.originalColor} onChange={(e) => setAppearance('originalColor', e.target.checked)} />
            </div>
            {slider(T('filterStrength'), 0, 100, opts.appearance.filterStrength, (v) => setAppearance('filterStrength', v), '%')}
            {slider(T('filterOpacity'), 0, 100, opts.appearance.filterOpacity, (v) => setAppearance('filterOpacity', v), '%')}
          </div>
        )}

        {panel === 'adjust' && (
          <div className="panel">
            <div className="group-label">{T('adjust')}</div>
            {slider(T('brightness'), 0, 200, opts.adjust.brightness, (v) => setAdjust('brightness', v), '%')}
            {slider(T('contrast'), 0, 200, opts.adjust.contrast, (v) => setAdjust('contrast', v), '%')}
            {slider(T('saturation'), 0, 200, opts.adjust.saturation, (v) => setAdjust('saturation', v), '%')}
            {slider(T('hue'), -180, 180, opts.adjust.hue, (v) => setAdjust('hue', v), '°')}
            {slider(T('exposure'), -100, 100, opts.adjust.exposure, (v) => setAdjust('exposure', v))}
            {slider(T('invert'), 0, 100, opts.adjust.invert, (v) => setAdjust('invert', v), '%')}
          </div>
        )}

        {panel === 'transform' && (
          <div className="panel">
            <div className="group-label">{T('transform')}</div>
            {slider(T('rotation'), -180, 180, opts.transform.rotation, (v) => setTransform('rotation', v), '°')}
            {slider(T('offsetX'), -100, 100, opts.transform.offsetX, (v) => setTransform('offsetX', v))}
            {slider(T('offsetY'), -100, 100, opts.transform.offsetY, (v) => setTransform('offsetY', v))}
            {slider(T('scale'), 50, 200, opts.transform.scale, (v) => setTransform('scale', v), '%')}
            {slider(T('skew'), -60, 60, opts.transform.skew, (v) => setTransform('skew', v), '°')}
            {slider(T('stretch'), 50, 200, opts.transform.stretch, (v) => setTransform('stretch', v), '%')}
            {slider(T('distort'), -50, 50, opts.transform.distort, (v) => setTransform('distort', v))}
            <button className="btn" onClick={resetTransform}>{T('resetTransform')}</button>
          </div>
        )}

        {panel === 'presets' && (
          <div className="panel">
            <div className="group-label">{T('presets')}</div>
            <select className="select" value={opts.presetId} onChange={(e) => applyPreset(e.target.value)}>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <div className="row-gap">
              <button className="btn" onClick={resetPreset}>{T('resetPreset')}</button>
              <button className="btn" onClick={randomize}>{T('random')}</button>
            </div>
            {slider(T('randomSeed'), 1, 9999, opts.randomSeed, (v) => update((o) => ({ ...o, randomSeed: v }), 'seed'))}
          </div>
        )}

        {/* IO actions */}
        <div className="actions">
          <button className="btn" disabled={!srcImg} onClick={() => { setSrcImg(null); setSrcUrl(null); setImageLayerCanvas(null) }}>{T('clear')}</button>
          <button className="btn" disabled={!outUrl} onClick={save}>{T('saveImage')}</button>
          <button className="btn" disabled={!outUrl} onClick={() => openCode('self')}>{T('exportCode')}</button>
        </div>
        <div className="actions">
          <button className="btn small" disabled={!outUrl} onClick={() => copyCode('self')}>{T('selfContained')}</button>
          <button className="btn small" disabled={!outUrl} onClick={() => copyCode('react')}>{T('reactEmbed')}</button>
          {copied && <span className="copied">{T('copyOk')}</span>}
        </div>
      </main>

      {/* Footer: language + undo/redo */}
      <footer className="footer">
        <button className="btn small" onClick={() => setLang((l) => (l === 'en' ? 'zh' : 'en'))}>
          {lang === 'en' ? '中文' : 'EN'} · {T('language')}
        </button>
        <div className="hist">
          <button className="btn small" disabled={!canUndo} onClick={undo}>↶ {T('undo')}</button>
          <button className="btn small" disabled={!canRedo} onClick={redo}>↷ {T('redo')}</button>
        </div>
      </footer>

      {showCode && (
        <div className="modal" onClick={() => setShowCode(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>{T('exportCodeTitle')}</span>
              <button className="btn small" onClick={() => setShowCode(false)}>{T('close')}</button>
            </div>
            <textarea className="code-area" readOnly value={codeText} />
            <button className="btn" onClick={() => { navigator.clipboard?.writeText(codeText); setCopied(true); window.setTimeout(() => setCopied(false), 1400) }}>{T('copyCode')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}
