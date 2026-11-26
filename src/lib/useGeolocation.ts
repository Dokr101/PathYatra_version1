import { useState } from 'react'
import { requestCurrentLocation, type GeoFix } from './geolocation'

/**
 * Deliberately not a useEffect-driven hook like useWeather: a location request
 * must only happen when the traveller asks for it.
 */
export function useGeolocation() {
  const [fix, setFix] = useState<GeoFix>({ status: 'idle' })

  const request = async (): Promise<GeoFix> => {
    setFix({ status: 'requesting' })
    const next = await requestCurrentLocation()
    setFix(next)
    return next
  }

  const reset = () => setFix({ status: 'idle' })

  return { fix, request, reset }
}
