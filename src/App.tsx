import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import {
  CHARSETS,
  DEFAULT_STATE,
} from './lib/ascii'
import type {
  EditorState,
  PrimId,
  CharsetId,
} from './lib/types'
import { SHADERS, SHADER_MAP, SHADER_CATEGORIES } from './lib/shaders'
import { renderPoster } from './lib/render'
import { History } from './lib/history'
import { t, type Lang } from './lib/i18n'
import { SAMPLES } from './App.samples'

// ---- export-code template generator ----
function buildExportHtml(opts: EditorState): string {
  return `<!-- Poster Studio export — self-contained ASCII poster config -->
<!doctype html>
<html><head><meta charset="utf-8"><title>Poster Studio Export</title>
<style>body{margin:0;background:#0f1117;display:grid;place-items:center;min-height:100vh}
pre{font-family:'Courier New',monospace;color:${opts.appearance.fgColor};background:${opts.appearance.bgColor};padding:16px;white-space:pre;overflow:auto;max-width:96vw;line-height:1}</style>
</head><body><pre id="art">Paste your source image to render.</pre>
<script>
// Editor state:
const STATE = ${JSON.stringify(opts, null, 2)};
console.log('Poster Studio state', STATE);
// Render by dropping an image onto the page — see renderPoster() in the app.
</script></body></html>`
}

function buildReactSnippet(opts: EditorState): string {
  return `// Drop into your React project (Poster Studio config)
import { DEFAULT_STATE } from './lib/ascii'
import type { EditorState } from './lib/types'

export const myPreset: EditorState = ${JSON.stringify(opts, null, 2)}

// <PosterStudio initialState={myPreset} />`
}

export default function App() {
  const [opts, setOpts] = useState<EditorState>(DEFAULT_STATE)
  const [srcImg, setSrcImg] = useState<HTMLCanvasElement | null>(null)
  const [srcUrl, setSrcUrl] = useState<string | null>(null)
  const [outUrl, setOutUrl] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [lang, setLang] = useState<Lang>('en')
  const [panel, setPanel] = useState<'none' | 'charsel' | 'shaderlist' | 'shaderparams' | 'appearance' | 'adjust' | 'transform' | 'presets'>('none')
  const [activeShaderCat, setActiveShaderCat] = useState<string>('Base')
  const [showCode, setShowCode] = useState(false)
  const [codeText, setCodeText] = useState('')
  const [copied, setCopied] = useState(false)
  const [previewOriginal, setPreviewOriginal] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
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

  // ---- render ----
  const renderTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(renderTimer.current)
    renderTimer.current = window.setTimeout(() => {
      if (!srcImg) { setOutUrl(null); return }
      const { canvas } = renderPoster(srcImg, opts)
      outCanvasRef.current = canvas
      setOutUrl(canvas.toDataURL('image/png'))
    }, 40)
    return () => window.clearTimeout(renderTimer.current)
  }, [srcImg, opts, previewOriginal])

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

  const selectCharset = (id: CharsetId) => setK('charsetId', id, 'charset')
  const selectShader = (id: PrimId) => {
    update((o) => ({ ...o, shaderId: id }), 'shader:' + id)
    const def = SHADER_MAP[id]
    if (def.params.length === 0) setPanel('shaderlist')
    else setPanel('shaderparams')
  }

  const copyCode = (kind: 'self' | 'react') => {
    const txt = kind === 'self' ? buildExportHtml(opts) : buildReactSnippet(opts)
    setCodeText(txt)
    navigator.clipboard?.writeText(txt).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    })
  }

  const openCode = (kind: 'self' | 'react') => {
    setCodeText(kind === 'self' ? buildExportHtml(opts) : buildReactSnippet(opts))
    setShowCode(true)
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
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f) }}
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
          className="canvas-wrap"
          onPointerDown={() => srcUrl && setPreviewOriginal(true)}
          onPointerUp={() => setPreviewOriginal(false)}
          onPointerLeave={() => setPreviewOriginal(false)}
          title={T('holdOriginal')}
        >
          {outUrl ? (
            <img
              src={previewOriginal && srcUrl ? srcUrl : outUrl}
              alt="ASCII poster preview"
            />
          ) : (
            <div className="placeholder">{T('uploadHint')}</div>
          )}
        </div>

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

        {/* Control rail buttons */}
        <div className="rail">
          <button className={`rail-btn ${panel === 'shaderlist' ? 'on' : ''}`} onClick={() => { setActiveShaderCat('Base'); setPanel('shaderlist') }}>{T('shaderList')}</button>
          <button className={`rail-btn ${panel === 'appearance' ? 'on' : ''}`} onClick={() => setPanel('appearance')}>{T('appearance')}</button>
          <button className={`rail-btn ${panel === 'adjust' ? 'on' : ''}`} onClick={() => setPanel('adjust')}>{T('adjust')}</button>
          <button className={`rail-btn ${panel === 'transform' ? 'on' : ''}`} onClick={() => setPanel('transform')}>{T('transform')}</button>
          <button className={`rail-btn ${panel === 'presets' ? 'on' : ''}`} onClick={() => setPanel('presets')}>{T('presets')}</button>
          <button className={`rail-btn ${panel === 'charsel' ? 'on' : ''}`} onClick={() => setPanel('charsel')}>{T('charset')}</button>
        </div>

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
          <button className="btn" disabled={!srcImg} onClick={() => { setSrcImg(null); setSrcUrl(null) }}>{T('clear')}</button>
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
