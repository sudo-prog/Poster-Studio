# Poster Studio

Poster Studio is an **installable, offline Progressive Web App** that converts any
image into ASCII art posters, entirely in the browser. It is a dependency-light
[Vite](https://vitejs.dev) + React + TypeScript client-side PWA — no backend, no
network calls for conversion.

## Features

- **6 charset presets** — ASCII Classic, Terminal, Binary, Japanese, Pixel, Thin Line
- **8 filter / appearance presets** — Plain, Paper, Glass, Dither, Halftone, Mosaic,
  Round-Square, CMYK
- **Adjust controls** — Resolution (40–200 columns), Brightness, Contrast sliders
- **Image upload** — drag & drop or click; bundled offline sample images
- **Save image** — render the ASCII canvas to a downloadable PNG
- **PWA** — manifest + service worker for installable, offline-capable use

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build (generates SW + manifest)
npm run preview  # serve the production build locally
```

## Tech

Vite · React · TypeScript · vite-plugin-pwa (Workbox). Image → ASCII is done with the
Canvas 2D API (`getImageData` brightness mapping) — never leaving the device.
