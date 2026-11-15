import { useEffect, useState } from 'react'
import { fetchForecast, type WeatherState } from './weather'

export function useWeather(lat: number, lng: number, place: string): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: 'loading', place, days: [] })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', place, days: [] })
    fetchForecast(lat, lng, place).then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [lat, lng, place])

  return state
}
