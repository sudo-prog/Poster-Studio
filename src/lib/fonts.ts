// Custom font upload registry — for the Text layer (Task B).
// Uploaded fonts are registered with document.fonts and exposed to the
// canvas text renderer. Fully client-side: File -> ArrayBuffer -> FontFace.

export interface UploadedFont {
  family: string // font-family name used in ctx.font
  label: string // human label for the picker
  source: string // blob: URL backing the FontFace (kept alive)
  loaded: boolean
}

const registered: UploadedFont[] = []
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribeFonts(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getUploadedFonts(): UploadedFont[] {
  return registered.slice()
}

// Sanitize a label into a valid CSS font-family token (quoted-safe).
function makeFamilyName(rawName: string): string {
  const base = rawName
    .replace(/\.(ttf|otf|woff|woff2)$/i, '')
    .replace(/[^a-zA-Z0-9\u00C0-\uFFFF_-]/g, '')
    .trim()
  const candidate = (base || 'Uploaded') + (registered.length + 1)
  // ensure uniqueness
  let name = candidate
  let n = 2
  while (registered.some((f) => f.family === name)) {
    name = candidate + n++
  }
  return name
}

export interface FontLoadResult {
  ok: boolean
  font?: UploadedFont
  error?: string
}

// Accepts a font File; resolves once the browser can render with it.
export function loadFontFile(file: File): Promise<FontLoadResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve({ ok: false, error: 'read-failed' })
    reader.onload = async () => {
      try {
        const buf = reader.result as ArrayBuffer
        const blob = new Blob([buf], { type: file.type || 'font/woff2' })
        const source = URL.createObjectURL(blob)
        const family = makeFamilyName(file.name)
        const label = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '')
        const ff = new FontFace(family, buf)
        await ff.load()
        document.fonts.add(ff)
        const entry: UploadedFont = { family, label, source, loaded: true }
        registered.push(entry)
        notify()
        resolve({ ok: true, font: entry })
      } catch (e) {
        resolve({ ok: false, error: String(e) })
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

// List of system fonts offered in addition to uploaded ones.
export const SYSTEM_FONTS: { family: string; label: string }[] = [
  { family: "'Inter', system-ui, sans-serif", label: 'Inter' },
  { family: 'system-ui, -apple-system, sans-serif', label: 'System Sans' },
  { family: "'Courier New', monospace", label: 'Courier Mono' },
  { family: "Georgia, 'Times New Roman', serif", label: 'Georgia' },
  { family: "'Comic Sans MS', cursive", label: 'Comic' },
  { family: 'Impact, sans-serif', label: 'Impact' },
  { family: 'Arial, sans-serif', label: 'Arial' },
]
