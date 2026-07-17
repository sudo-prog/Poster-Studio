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
]
