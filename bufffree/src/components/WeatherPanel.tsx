import { Cloud, CloudRain, CloudSnow, CloudSun, Droplets, Sun, ThermometerSnowflake } from 'lucide-react'
import type { Destination } from '../types'
import { useWeather } from '../lib/useWeather'
import { seasonalNormal, type WeatherDay } from '../lib/weather'
import { MONTHS } from '../data/taxonomy'
import { Skeleton } from './ui'

function WeatherIcon({ code, size = 16 }: { code: number; size?: number }) {
  if (code === 0 || code === 1) return <Sun size={size} className="text-marigold" />
  if (code === 2) return <CloudSun size={size} className="text-ink-soft" />
  if (code >= 71 && code <= 86) return <CloudSnow size={size} className="text-mist" />
  if (code >= 51) return <CloudRain size={size} className="text-mist" />
  return <Cloud size={size} className="text-ink-mute" />
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })
}

export function WeatherPanel({ destination }: { destination: Destination }) {
  const weather = useWeather(destination.lat, destination.lng, destination.name)
  const month = new Date().getMonth() + 1
  const normal = seasonalNormal(destination.altitude ?? 500, month)

  return (
    <div className="rounded-2xl border border-line bg-white/55 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-mute">Conditions</p>
          <h3 className="mt-0.5 font-display text-lg leading-tight text-ink">
            {weather.status === 'live' ? 'Next seven days' : `${MONTHS[month - 1]} expectations`}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[10px] font-medium text-ink-soft">
          <span className={`h-1.5 w-1.5 rounded-full ${weather.status === 'live' ? 'bg-pine-3' : 'bg-marigold'}`} />
          {weather.status === 'live'
            ? 'Live · Open-Meteo'
            : weather.status === 'loading'
              ? 'Fetching forecast'
              : 'Seasonal normals'}
        </span>
      </div>

      {weather.status === 'loading' ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : weather.status === 'live' ? (
        <>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {weather.days.slice(0, 7).map((day: WeatherDay) => (
              <div
                key={day.date}
                className="min-w-[82px] flex-1 rounded-xl border border-line/80 bg-paper px-2 py-2.5 text-center"
              >
                <p className="text-[10px] uppercase tracking-[0.1em] text-ink-mute">{dayLabel(day.date)}</p>
                <div className="my-1.5 flex justify-center">
                  <WeatherIcon code={day.code} size={18} />
                </div>
                <p className="text-[11px] font-medium text-ink">
                  {day.max}° <span className="font-normal text-ink-mute">{day.min}°</span>
                </p>
                <p className="mt-0.5 text-[9px] text-ink-mute">{day.rain > 0 ? `${day.rain} mm` : 'dry'}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">{weather.note}</p>
        </>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-line/80 bg-paper px-2.5 py-3 text-center">
            <ThermometerSnowflake size={16} className="mx-auto text-clay" />
            <p className="mt-1.5 font-display text-lg leading-none text-ink">{normal.min}°</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-ink-mute">night low</p>
          </div>
          <div className="rounded-xl border border-line/80 bg-paper px-2.5 py-3 text-center">
            <Sun size={16} className="mx-auto text-marigold" />
            <p className="mt-1.5 font-display text-lg leading-none text-ink">{normal.max}°</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-ink-mute">day high</p>
          </div>
          <div className="rounded-xl border border-line/80 bg-paper px-2.5 py-3 text-center">
            <Droplets size={16} className="mx-auto text-mist" />
            <p className="mt-1.5 font-display text-lg leading-none text-ink">{normal.rainChance}%</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-ink-mute">rain chance</p>
          </div>
          <p className="col-span-3 text-[10px] leading-relaxed text-ink-mute">
            {normal.summary} {weather.note}
          </p>
        </div>
      )}
    </div>
  )
}
