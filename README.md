# Poster Studio

Poster Studio is an **installable, offline Progressive Web App** that converts any image into ASCII art posters, entirely in the browser. It is a dependency-light [Vite](https://vitejs.dev) + React + TypeScript client-side PWA — no backend, no network calls for conversion. All processing happens locally on the user's device.

## What It Is

A privacy-first creative tool that turns photos and images into stylized ASCII art posters. Because it runs entirely client-side, your images never leave the device — perfect for offline use and reproducible poster generation.

## Key Features

- **6 charset presets** — ASCII Classic, Terminal, Binary, Japanese, Pixel, Thin Line
- **8 filter / appearance presets** — Plain, Paper, Glass, Dither, Halftone, Mosaic, Round-Square, CMYK
- **Adjust controls** — Resolution (40–200 columns), Brightness, Contrast sliders
- **Image upload** — drag & drop or click; bundled offline sample images
- **Save image** — render the ASCII canvas to a downloadable PNG
- **PWA** — manifest + service worker for installable, offline-capable use

## Tech Stack

- **Build Tool**: Vite
- **Framework**: React 18
- **Language**: TypeScript
- **PWA**: `vite-plugin-pwa` (Workbox) for offline caching and installability
- **Rendering**: Canvas 2D API (`getImageData` brightness mapping) — never leaving the device

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation & Develop

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Type-check + production build (generates SW + manifest)
npm run build

# Serve the production build locally (port 4173)
npm run preview
```

### Deployment

Static files are generated into `dist/`. Deploy to any static host, or use the bundled scripts:

```bash
./scripts/deploy_ghpages.sh   # deploy to GitHub Pages
./scripts/deploy_pages.sh     # alternative Pages deploy
```

## Usage

1. Open the app in a browser (or install it as a PWA).
2. Drag & drop an image or click to upload.
3. Choose a charset and an appearance filter preset.
4. Tune resolution, brightness, and contrast with the sliders.
5. Save the rendered ASCII poster as a PNG.

## Privacy

All conversion happens in-browser. No image data is uploaded to any server.

## License

MIT License — see [LICENSE](LICENSE) for details.

## Links

- [Vite](https://vitejs.dev)
- [React](https://react.dev)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
