export interface WeatherDay {
  date: string
  max: number
  min: number
  rain: number
  code: number
  label: string
}

export interface WeatherState {
  status: 'loading' | 'live' | 'seasonal' | 'error'
  place: string
  days: WeatherDay[]
  updatedAt?: string
  note?: string
}

export const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Heavy showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
}

export function weatherLabel(code: number): string {
  return WEATHER_CODES[code] ?? 'Mixed conditions'
}

export async function fetchForecast(lat: number, lng: number, place: string): Promise<WeatherState> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toFixed(4))
  url.searchParams.set('longitude', lng.toFixed(4))
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code')
  url.searchParams.set('timezone', 'Asia/Kathmandu')
  url.searchParams.set('forecast_days', '7')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url.toString(), { signal: controller.signal })
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`)
    const data = (await response.json()) as {
      daily?: {
        time: string[]
        temperature_2m_max: number[]
        temperature_2m_min: number[]
        precipitation_sum: number[]
        weather_code: number[]
      }
    }
    if (!data.daily?.time?.length) throw new Error('No forecast data')

    const days: WeatherDay[] = data.daily.time.map((date, index) => ({
      date,
      max: Math.round(data.daily!.temperature_2m_max[index]),
      min: Math.round(data.daily!.temperature_2m_min[index]),
      rain: Math.round((data.daily!.precipitation_sum[index] ?? 0) * 10) / 10,
      code: data.daily!.weather_code[index],
      label: weatherLabel(data.daily!.weather_code[index]),
    }))

    return {
      status: 'live',
      place,
      days,
      updatedAt: new Date().toISOString(),
      note: 'Live forecast from Open-Meteo. Conditions in the mountains change faster than any model.',
    }
  } catch {
    return {
      status: 'error',
      place,
      days: [],
      note: 'Live forecast could not be reached. Use the seasonal guidance and confirm locally before departure.',
    }
  } finally {
    clearTimeout(timeout)
  }
}

export interface SeasonalNormal {
  max: number
  min: number
  rainChance: number
  summary: string
}

export function seasonalNormal(altitude: number, month: number): SeasonalNormal {
  const monthMax = [18, 20, 24, 27, 28, 28, 27, 27, 26, 24, 21, 18][month - 1] ?? 22
  const monthRain = [4, 6, 12, 20, 32, 62, 78, 75, 58, 18, 5, 3][month - 1] ?? 20
  const lapse = (Math.max(0, altitude) / 1000) * 6.2
  const max = Math.round(monthMax - lapse)
  const min = Math.round(max - 8 - (altitude > 2500 ? 3 : 0))
  const rainChance = Math.min(92, Math.round(monthRain + (altitude > 2500 ? 6 : 0)))
  const summary =
    monthRain > 55
      ? 'Monsoon pattern: humid, cloudy and unsettled, with the highest landslide risk of the year.'
      : monthRain > 20
        ? 'Shoulder season: warm days, a real chance of afternoon cloud and showers.'
        : 'Drier settled pattern: clear mornings are likely, nights are cold.'
  return { max, min, rainChance, summary }
}
