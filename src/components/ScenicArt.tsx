import { useId } from 'react'
import type { SceneKind, SceneSky } from '../types'

interface Scene {
  kind: SceneKind
  sky: SceneSky
  seed: number
}

interface Props {
  scene: Scene
  className?: string
  label?: string
}

const SKIES: Record<SceneSky, { stops: string[]; sun: string; ridges: string[]; haze: string }> = {
  dawn: {
    stops: ['#F8D9A6', '#F1A874', '#BE7178', '#5E4A6B'],
    sun: '#FBE6BD',
    ridges: ['#7C6179', '#5A4E68', '#333B4D'],
    haze: '#F6D3B0',
  },
  clear: {
    stops: ['#BEDFEF', '#DAE9E0', '#F3EEDC'],
    sun: '#F8EDC8',
    ridges: ['#93B0B9', '#66848C', '#395355'],
    haze: '#E8F0E8',
  },
  dusk: {
    stops: ['#3B3C5B', '#7E566F', '#DE9870', '#F5D2A4'],
    sun: '#F6BC85',
    ridges: ['#5D4A63', '#403A50', '#232B38'],
    haze: '#D99A78',
  },
  night: {
    stops: ['#0E1A26', '#1B2F42', '#2E4A5E'],
    sun: '#E8F0F1',
    ridges: ['#2A3D4F', '#1D2B39', '#101B25'],
    haze: '#41607A',
  },
  alpine: {
    stops: ['#DCEBF3', '#C3D9E4', '#F2EBDB'],
    sun: '#FAF2DC',
    ridges: ['#A7C0CC', '#7A98A3', '#4C686E'],
    haze: '#E4EDF0',
  },
}

function random(seed: number) {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

function ridgePoints(seed: number, baseY: number, height: number, segments = 9) {
  const rand = random(seed)
  const points: Array<[number, number]> = []
  for (let i = 0; i <= segments; i += 1) {
    const x = (480 / segments) * i
    const spike = i % 2 === 0 ? 0.45 + rand() * 0.55 : 0.08 + rand() * 0.32
    points.push([x, baseY - height * spike])
  }
  let path = `M0 320 L0 ${points[0][1].toFixed(1)}`
  points.forEach(([x, y]) => {
    path += ` L${x.toFixed(1)} ${y.toFixed(1)}`
  })
  path += ' L480 320 Z'
  return { path, points }
}

function snowCaps(points: Array<[number, number]>, baseY: number, height: number) {
  return points
    .filter(([, y]) => y < baseY - height * 0.62)
    .map(([x, y]) => {
      const size = 13
      return `M${(x - size).toFixed(1)} ${(y + size * 1.25).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${(x + size).toFixed(1)} ${(y + size * 1.25).toFixed(1)} L${(x + size * 0.3).toFixed(1)} ${(y + size * 0.85).toFixed(1)} L${x.toFixed(1)} ${(y + size * 1.1).toFixed(1)} L${(x - size * 0.35).toFixed(1)} ${(y + size * 0.8).toFixed(1)} Z`
    })
    .join(' ')
}

function peaks(seed: number, colors: string[]) {
  const back = ridgePoints(seed + 3, 208, 96, 8)
  const mid = ridgePoints(seed + 17, 242, 78, 7)
  const front = ridgePoints(seed + 31, 282, 56, 6)
  return (
    <>
      <path d={back.path} fill={colors[0]} opacity="0.72" />
      <path d={snowCaps(back.points, 208, 96)} fill="#FBF7EE" opacity="0.82" />
      <path d={mid.path} fill={colors[1]} opacity="0.9" />
      <path d={snowCaps(mid.points, 242, 78)} fill="#F6F1E4" opacity="0.62" />
      <path d={front.path} fill={colors[2]} />
      <path d="M0 300 L480 300 L480 320 L0 320 Z" fill={colors[2]} />
      <path
        d="M60 320 C 120 292, 170 300, 210 312 C 260 326, 330 292, 402 306"
        stroke="#F4E8D2"
        strokeWidth="1.6"
        strokeDasharray="5 6"
        fill="none"
        opacity="0.5"
      />
      <g opacity="0.95">
        <path d="M320 146 L404 160" stroke="#4A4038" strokeWidth="1.4" />
        {[0, 1, 2, 3, 4].map((index) => {
          const colorsFlag = ['#2F6FB0', '#F7F3E8', '#C8503F', '#3E8A5F', '#E8AE4C']
          const x = 326 + index * 16
          const y = 147 + index * 3
          return (
            <path
              key={index}
              d={`M${x} ${y} L${x + 12} ${y + 2} L${x + 10} ${y + 14} L${x - 2} ${y + 12} Z`}
              fill={colorsFlag[index]}
              opacity="0.9"
            />
          )
        })}
      </g>
    </>
  )
}

function temple(seed: number, colors: string[]) {
  const rand = random(seed)
  const pagoda = (cx: number, baseY: number, scale: number, fill: string) => (
    <g fill={fill}>
      <rect x={cx - 26 * scale} y={baseY - 26 * scale} width={52 * scale} height={26 * scale} />
      <path d={`M${cx - 40 * scale} ${baseY - 26 * scale} L${cx + 40 * scale} ${baseY - 26 * scale} L${cx + 26 * scale} ${baseY - 40 * scale} L${cx - 26 * scale} ${baseY - 40 * scale} Z`} />
      <rect x={cx - 16 * scale} y={baseY - 54 * scale} width={32 * scale} height={14 * scale} />
      <path d={`M${cx - 30 * scale} ${baseY - 54 * scale} L${cx + 30 * scale} ${baseY - 54 * scale} L${cx + 18 * scale} ${baseY - 66 * scale} L${cx - 18 * scale} ${baseY - 66 * scale} Z`} />
      <path d={`M${cx - 7 * scale} ${baseY - 66 * scale} L${cx} ${baseY - 86 * scale} L${cx + 7 * scale} ${baseY - 66 * scale} Z`} />
    </g>
  )
  return (
    <>
      <path
        d="M0 250 C 90 226, 170 262, 250 240 C 330 218, 400 252, 480 232 L480 320 L0 320 Z"
        fill={colors[0]}
        opacity="0.55"
      />
      <path
        d="M0 280 C 110 262, 210 292, 300 276 C 370 264, 430 284, 480 274 L480 320 L0 320 Z"
        fill={colors[1]}
        opacity="0.8"
      />
      {pagoda(150, 290, 1.35, colors[2])}
      {pagoda(352, 278, 0.9, colors[2])}
      {pagoda(414, 292, 0.62, colors[2])}
      <g fill={colors[2]}>
        <rect x="96" y="292" width="30" height="20" rx="2" />
        <rect x="240" y="286" width="24" height="18" rx="2" />
        <path d="M92 292 L111 278 L130 292 Z" />
      </g>
      <g opacity="0.7" stroke="#FBEFD8" strokeWidth="1.2">
        <path d="M0 306 L480 306" strokeDasharray="3 5" />
      </g>
      <circle cx={60 + Math.round(rand() * 30)} cy={262} r="2.4" fill="#F7DDA8" opacity="0.8" />
      <circle cx={78 + Math.round(rand() * 20)} cy={248} r="1.8" fill="#F7DDA8" opacity="0.7" />
    </>
  )
}

function lake(seed: number, colors: string[], sunColor: string) {
  const back = ridgePoints(seed + 5, 214, 90, 8)
  return (
    <>
      <path d={back.path} fill={colors[0]} opacity="0.78" />
      <path d={snowCaps(back.points, 214, 90)} fill="#FBF7EE" opacity="0.75" />
      <path d="M0 214 C 100 232, 200 200, 300 214 C 370 224, 430 206, 480 214 L480 236 L0 236 Z" fill={colors[1]} opacity="0.9" />
      <rect x="0" y="234" width="480" height="86" fill="#2E4C58" opacity="0.86" />
      <path d="M0 234 L480 234 L480 246 C 400 254, 340 238, 260 246 C 190 254, 110 240, 0 248 Z" fill={sunColor} opacity="0.22" />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <path
          key={index}
          d={`M${40 + index * 12} ${262 + index * 9} L${180 + index * 18} ${262 + index * 9}`}
          stroke="#F4E9D3"
          strokeWidth={index < 3 ? 1.6 : 1}
          opacity={0.34 - index * 0.04}
        />
      ))}
      <path d="M296 300 L340 300 L324 288 L312 288 Z" fill="#1B2B2C" />
      <path d="M312 286 L312 300" stroke="#1B2B2C" strokeWidth="3" />
      <path d="M300 254 C 320 250, 342 258, 360 254" stroke="#F4E9D3" strokeWidth="1.2" opacity="0.4" fill="none" />
      <g fill="#16241F">
        <path d="M20 250 L34 220 L48 250 Z" />
        <path d="M52 252 L64 226 L76 252 Z" />
        <path d="M430 250 L444 218 L458 250 Z" />
      </g>
    </>
  )
}

function jungle(seed: number, colors: string[], sunColor: string) {
  const rand = random(seed)
  const trees = Array.from({ length: 12 }, (_, index) => {
    const x = 12 + index * 41 + Math.round(rand() * 12)
    const h = 42 + Math.round(rand() * 46)
    return { x, h }
  })
  return (
    <>
      <circle cx="360" cy="86" r="30" fill={sunColor} opacity="0.5" />
      <path d="M0 236 C 80 220, 140 244, 220 230 C 300 216, 380 240, 480 224 L480 320 L0 320 Z" fill={colors[0]} opacity="0.65" />
      <path d="M0 268 C 120 250, 220 276, 320 262 C 390 252, 440 266, 480 258 L480 320 L0 320 Z" fill={colors[1]} opacity="0.82" />
      <g fill={colors[2]}>
        {trees.map((tree, index) => (
          <g key={index}>
            <path
              d={`M${tree.x} 296 L${tree.x - tree.h * 0.36} 296 L${tree.x - tree.h * 0.16} ${296 - tree.h * 0.55} L${tree.x - tree.h * 0.3} ${296 - tree.h * 0.55} L${tree.x} ${296 - tree.h} L${tree.x + tree.h * 0.3} ${296 - tree.h * 0.55} L${tree.x + tree.h * 0.16} ${296 - tree.h * 0.55} L${tree.x + tree.h * 0.36} 296 Z`}
            />
            <rect x={tree.x - 1.6} y="292" width="3.2" height="14" />
          </g>
        ))}
      </g>
      <g stroke={colors[2]} fill="none" strokeWidth="2" opacity="0.9">
        <path d="M0 306 C 60 300, 120 312, 180 306 C 240 300, 300 312, 360 306 C 420 300, 450 310, 480 306" />
      </g>
      <g stroke="#20302A" fill="none" strokeWidth="1.4" opacity="0.65">
        <path d="M40 74 l10 -8 l10 8" />
        <path d="M70 58 l8 -6 l8 6" />
        <path d="M300 54 l9 -7 l9 7" />
      </g>
      <path
        d="M64 280 C 120 268, 160 288, 210 280"
        stroke="#EADCC0"
        strokeWidth="1.3"
        strokeDasharray="4 5"
        fill="none"
        opacity="0.45"
      />
    </>
  )
}

// `_seed` is accepted because every scene art takes one; this drawing is fixed.
function stupa(_seed: number, colors: string[], sunColor: string) {
  return (
    <>
      <path d="M0 252 C 90 236, 180 258, 270 242 C 350 228, 420 250, 480 240 L480 320 L0 320 Z" fill={colors[0]} opacity="0.6" />
      <path d="M0 282 C 120 268, 220 292, 320 280 C 390 272, 440 286, 480 280 L480 320 L0 320 Z" fill={colors[1]} opacity="0.85" />
      <g fill={colors[2]}>
        <rect x="164" y="248" width="152" height="34" rx="3" />
        <rect x="186" y="234" width="108" height="18" rx="3" />
        <path d="M186 240 C 186 200, 294 200, 294 240 Z" />
        <rect x="226" y="176" width="28" height="26" />
        <path d="M226 178 L240 160 L254 178 Z" />
        <rect x="236" y="146" width="8" height="20" />
        <path d="M240 132 L248 150 L232 150 Z" />
        <rect x="140" y="282" width="200" height="22" rx="3" />
      </g>
      <g opacity="0.85">
        <path d="M164 262 L316 262" stroke="#F3E4C6" strokeWidth="1.2" opacity="0.5" />
        <path d="M176 246 C 214 232, 266 232, 304 246" stroke="#F3E4C6" strokeWidth="1.4" fill="none" opacity="0.4" />
      </g>
      <g>
        <path d="M120 300 L172 268" stroke="#3F3A31" strokeWidth="1.2" />
        {[0, 1, 2, 3, 4].map((index) => (
          <rect
            key={index}
            x={128 + index * 9}
            y={296 - index * 6}
            width="7"
            height="6"
            fill={['#2F6FB0', '#F7F3E8', '#C8503F', '#3E8A5F', '#E8AE4C'][index]}
            opacity="0.85"
            transform={`rotate(-30 ${131 + index * 9} ${299 - index * 6})`}
          />
        ))}
      </g>
      <circle cx="382" cy="92" r="22" fill={sunColor} opacity="0.45" />
    </>
  )
}

function hills(seed: number, colors: string[], sunColor: string) {
  const rand = random(seed)
  const houses = Array.from({ length: 7 }, (_, index) => ({
    x: 40 + index * 62 + Math.round(rand() * 16),
    y: 258 + Math.round(rand() * 26),
  }))
  return (
    <>
      <circle cx="386" cy="82" r="26" fill={sunColor} opacity="0.55" />
      <path d="M0 210 C 100 176, 180 214, 260 190 C 340 166, 420 202, 480 186 L480 320 L0 320 Z" fill={colors[0]} opacity="0.55" />
      <path d="M0 248 C 110 218, 200 258, 300 236 C 380 218, 440 246, 480 236 L480 320 L0 320 Z" fill={colors[1]} opacity="0.75" />
      <path d="M0 288 C 120 264, 230 300, 330 282 C 400 270, 450 288, 480 282 L480 320 L0 320 Z" fill={colors[2]} />
      <g stroke="#EBDCC0" strokeWidth="1" opacity="0.28" fill="none">
        {[0, 1, 2, 3, 4].map((index) => (
          <path
            key={index}
            d={`M0 ${296 + index * 5} C 130 ${280 + index * 5}, 240 ${306 + index * 4}, 480 ${288 + index * 5}`}
          />
        ))}
      </g>
      <g fill="#20302A">
        {houses.map((house, index) => (
          <g key={index}>
            <rect x={house.x} y={house.y} width="18" height="12" />
            <path d={`M${house.x - 3} ${house.y} L${house.x + 9} ${house.y - 8} L${house.x + 21} ${house.y} Z`} />
          </g>
        ))}
      </g>
    </>
  )
}

export function ScenicArt({ scene, className, label }: Props) {
  const gradientId = useId().replace(/[:]/g, '')
  const palette = SKIES[scene.sky] ?? SKIES.clear
  const stops = palette.stops

  return (
    <svg
      viewBox="0 0 480 320"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={label ?? 'Illustrated Nepali landscape'}
    >
      <defs>
        <linearGradient id={`sky-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          {stops.map((color, index) => (
            <stop key={color} offset={`${(index / (stops.length - 1)) * 100}%`} stopColor={color} />
          ))}
        </linearGradient>
        <radialGradient id={`glow-${gradientId}`}>
          <stop offset="0%" stopColor={palette.sun} stopOpacity="0.85" />
          <stop offset="100%" stopColor={palette.sun} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="480" height="320" fill={`url(#sky-${gradientId})`} />
      <circle cx="356" cy="86" r="56" fill={`url(#glow-${gradientId})`} opacity="0.55" />
      <circle cx="356" cy="86" r="17" fill={palette.sun} opacity={scene.sky === 'night' ? 0.9 : 0.72} />

      {scene.kind === 'peaks' && peaks(scene.seed, palette.ridges)}
      {scene.kind === 'temple' && temple(scene.seed, palette.ridges)}
      {scene.kind === 'lake' && lake(scene.seed, palette.ridges, palette.sun)}
      {scene.kind === 'jungle' && jungle(scene.seed, palette.ridges, palette.sun)}
      {scene.kind === 'stupa' && stupa(scene.seed, palette.ridges, palette.sun)}
      {scene.kind === 'hills' && hills(scene.seed, palette.ridges, palette.sun)}

      <rect width="480" height="320" fill={palette.haze} opacity="0.05" />
      <path d="M0 0 L480 0 L480 34 C 380 18, 300 44, 210 26 C 130 10, 60 30, 0 18 Z" fill={palette.haze} opacity="0.16" />
    </svg>
  )
}
