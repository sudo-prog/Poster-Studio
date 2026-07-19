// A few bundled sample images so the app works fully offline (no network).
export const SAMPLES: {
  id: string
  label: string
  draw: (c: HTMLCanvasElement) => void
}[] = [
  {
    id: 'grad',
    label: 'Gradient',
    draw: (c) => {
      const x = c.getContext('2d')!
      const g = x.createLinearGradient(0, 0, c.width, c.height)
      g.addColorStop(0, '#ffd166')
      g.addColorStop(0.5, '#ef476f')
      g.addColorStop(1, '#06d6a0')
      x.fillStyle = g
      x.fillRect(0, 0, c.width, c.height)
    },
  },
  {
    id: 'circle',
    label: 'Orb',
    draw: (c) => {
      const x = c.getContext('2d')!
      x.fillStyle = '#0b1020'
      x.fillRect(0, 0, c.width, c.height)
      const g = x.createRadialGradient(
        c.width / 2, c.height / 2, 8,
        c.width / 2, c.height / 2, c.width / 2,
      )
      g.addColorStop(0, '#ffffff')
      g.addColorStop(1, '#1b3bff')
      x.fillStyle = g
      x.beginPath()
      x.arc(c.width / 2, c.height / 2, c.width / 2 - 10, 0, Math.PI * 2)
      x.fill()
    },
  },
  {
    id: 'checker',
    label: 'Checker',
    draw: (c) => {
      const x = c.getContext('2d')!
      const s = c.width / 8
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
          x.fillStyle = (i + j) % 2 ? '#f4f4f4' : '#222'
          x.fillRect(i * s, j * s, s, s)
        }
    },
  },
  {
    id: 'face',
    label: 'Face',
    draw: (c) => {
      const x = c.getContext('2d')!
      x.fillStyle = '#1a1626'
      x.fillRect(0, 0, c.width, c.height)
      // head
      x.fillStyle = '#f2c79a'
      x.beginPath(); x.ellipse(c.width / 2, c.height / 2, c.width * 0.26, c.height * 0.32, 0, 0, Math.PI * 2); x.fill()
      // hair
      x.fillStyle = '#3a2a1a'
      x.beginPath(); x.ellipse(c.width / 2, c.height * 0.38, c.width * 0.28, c.height * 0.22, 0, Math.PI, 0); x.fill()
      // eyes
      x.fillStyle = '#221'
      x.beginPath(); x.arc(c.width * 0.42, c.height * 0.48, 12, 0, Math.PI * 2); x.fill()
      x.beginPath(); x.arc(c.width * 0.58, c.height * 0.48, 12, 0, Math.PI * 2); x.fill()
      // mouth
      x.strokeStyle = '#a33'; x.lineWidth = 8
      x.beginPath(); x.arc(c.width / 2, c.height * 0.6, 40, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke()
    },
  },
  {
    id: 'landscape',
    label: 'Hills',
    draw: (c) => {
      const x = c.getContext('2d')!
      const g = x.createLinearGradient(0, 0, 0, c.height)
      g.addColorStop(0, '#0b1e3a'); g.addColorStop(0.6, '#2a4a7a'); g.addColorStop(1, '#cfe7ff')
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height)
      x.fillStyle = '#0c2a1a'
      x.beginPath()
      x.moveTo(0, c.height)
      x.lineTo(0, c.height * 0.62)
      for (let i = 0; i <= 8; i++) {
        const px = (i / 8) * c.width
        const py = c.height * (0.62 + Math.sin(i) * 0.05)
        x.lineTo(px, py)
      }
      x.lineTo(c.width, c.height); x.closePath(); x.fill()
      x.fillStyle = '#ffd166'
      x.beginPath(); x.arc(c.width * 0.72, c.height * 0.3, 36, 0, Math.PI * 2); x.fill()
    },
  },
]
