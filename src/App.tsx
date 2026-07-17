import { useRef, useState, useEffect, useCallback } from 'react'
import {
  CHARSETS,
  FILTERS,
  DEFAULT_OPTIONS,
  type CharsetId,
  type FilterId,
  type PosterOptions,
} from './lib/ascii'
import { renderPoster } from './lib/render'
import { SAMPLES } from './App.samples'

export default function App() {
  const [opts, setOpts] = useState<PosterOptions>(DEFAULT_OPTIONS)
  const [srcImg, setSrcImg] = useState<HTMLCanvasElement | null>(null)
  const [outUrl, setOutUrl] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const outCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const setCharset = (id: CharsetId) => setOpts((o) => ({ ...o, charsetId: id }))
  const setFilter = (id: FilterId) => setOpts((o) => ({ ...o, filterId: id }))
  const setK = <K extends keyof PosterOptions>(k: K, v: PosterOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }))

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
  }, [])

  // Render whenever source or options change (debounced for slider smoothness).
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
  }, [srcImg, opts])

  const save = () => {
    if (!outCanvasRef.current) return
    const a = document.createElement('a')
    a.href = outCanvasRef.current.toDataURL('image/png')
    a.download = `poster-${opts.charsetId}-${opts.filterId}.png`
    a.click()
  }

  return (
    <div className="app">
      <div className="header">
        <div className="logo">&lt;/&gt;</div>
        <div>
          <h1>Poster Studio</h1>
          <p>Turn any image into an ASCII art poster — 100% offline.</p>
        </div>
      </div>

      <div className="layout">
        <aside className="panel">
          <h2>Image</h2>
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
            <strong>Click or drop</strong> an image here
            <input
              ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f) }}
            />
          </div>
          <div className="samples">
            {SAMPLES.map((s) => (
              <button key={s.id} onClick={() => loadSample(s.id)}>{s.label}</button>
            ))}
          </div>

          <h2>Charset</h2>
          <div className="group">
            {CHARSETS.map((c) => (
              <button
                key={c.id}
                className={`chip ${opts.charsetId === c.id ? 'active' : ''}`}
                onClick={() => setCharset(c.id)}
              >
                <span className="dot" />
                {c.label}
                <span className="preview">{c.ramp.slice(0, 6)}</span>
              </button>
            ))}
          </div>

          <h2>Filter</h2>
          <div className="group">
            {FILTERS.map((flt) => (
              <button
                key={flt.id}
                className={`chip ${opts.filterId === flt.id ? 'active' : ''}`}
                onClick={() => setFilter(flt.id)}
              >
                <span className="dot" />
                {flt.label}
              </button>
            ))}
          </div>

          <h2>Adjust</h2>
          <Slider label="Resolution" min={40} max={200} value={opts.columns}
            onChange={(v) => setK('columns', v)} suffix=" cols" />
          <Slider label="Brightness" min={0} max={200} value={opts.brightness}
            onChange={(v) => setK('brightness', v)} suffix="%" />
          <Slider label="Contrast" min={0} max={200} value={opts.contrast}
            onChange={(v) => setK('contrast', v)} suffix="%" />
        </aside>

        <section className="stage">
          <div className="canvas-wrap">
            {outUrl
              ? <img src={outUrl} alt="ASCII poster preview" />
              : <div className="placeholder">Upload an image or pick a sample to begin.</div>}
          </div>
          <div className="actions">
            <button className="btn primary" disabled={!outUrl} onClick={save}>
              Save image
            </button>
            <button className="btn" disabled={!srcImg}
              onClick={() => setSrcImg(null)}>Clear</button>
          </div>
        </section>
      </div>

      <div className="footer">
        Poster Studio · Installable &amp; offline PWA · {new Date().getFullYear()}
      </div>
    </div>
  )
}

function Slider(props: {
  label: string; min: number; max: number; value: number
  onChange: (v: number) => void; suffix?: string
}) {
  return (
    <div className="slider">
      <label>{props.label}<b>{props.value}{props.suffix ?? ''}</b></label>
      <input type="range" min={props.min} max={props.max} value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))} />
    </div>
  )
}
