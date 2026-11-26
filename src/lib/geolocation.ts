import { ORIGINS } from '../data/taxonomy'
import type { Origin } from '../types'

/** The synthetic origin id a device fix is carried under, end to end. */
export const MY_LOCATION_ID = 'my-location'
export const MY_LOCATION_NAME = 'Your location'

export type GeoFixStatus = 'idle' | 'requesting' | 'success' | 'error'

export type GeoErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'invalid_coordinates'

export interface GeoFix {
  status: GeoFixStatus
  lat?: number
  lng?: number
  accuracyMeters?: number
  label?: string
  errorCode?: GeoErrorCode
  errorMessage?: string
}

const ERROR_COPY: Record<GeoErrorCode, string> = {
  unsupported:
    'This browser does not offer a location. Pick the nearest city from the list — everything else works the same.',
  permission_denied:
    'Location permission is blocked. Allow it for this site in your browser settings, or pick the nearest city from the list.',
  position_unavailable:
    'Your device could not get a position just now. Try again near a window or outdoors, or pick the nearest city.',
  timeout: 'Finding your location took too long. Try again, or pick the nearest city from the list.',
  invalid_coordinates:
    'The location came back outside valid coordinates, so it was not used. Pick the nearest city instead.',
}

function errorFix(code: GeoErrorCode): GeoFix {
  return { status: 'error', errorCode: code, errorMessage: ERROR_COPY[code] }
}

/** Printed beside the field, so a fix is recognisable without exposing a precise pin. */
export function coordinateLabel(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(3)}° ${ns}, ${Math.abs(lng).toFixed(3)}° ${ew}`
}

/** Three decimals is about 110 m: enough to rebuild the route, not a precise pin. */
export function approximateCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * One-shot fix, wrapped as a promise. Only call this from a user gesture: the
 * browser's permission prompt must follow a click, never a page load.
 */
export function requestCurrentLocation(): Promise<GeoFix> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator) || !navigator.geolocation) {
    return Promise.resolve(errorFix('unsupported'))
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const valid =
          Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
        if (!valid) {
          resolve(errorFix('invalid_coordinates'))
          return
        }
        resolve({
          status: 'success',
          lat,
          lng,
          accuracyMeters: Number.isFinite(position.coords.accuracy)
            ? Math.round(position.coords.accuracy)
            : undefined,
          label: MY_LOCATION_NAME,
        })
      },
      (error) => {
        const codes: Record<number, GeoErrorCode> = {
          1: 'permission_denied',
          2: 'position_unavailable',
          3: 'timeout',
        }
        resolve(errorFix(codes[error.code] ?? 'position_unavailable'))
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  })
}

/**
 * A GPS origin has no district, so `isLocalTrip()` treats it as "not local" and
 * the plan keeps its travel day. That is the intended behaviour.
 */
export function myLocationOrigin(lat: number, lng: number, label?: string): Origin {
  return { id: MY_LOCATION_ID, name: label?.trim() || MY_LOCATION_NAME, district: '', lat, lng }
}

/**
 * Resolves a stored origin id back to an Origin. A GPS origin is rebuilt from
 * the coordinates saved alongside the plan instead of falling through to the
 * city list (which would silently turn it into Kathmandu).
 */
export function resolveOrigin(
  originId: string,
  label?: string,
  lat?: number,
  lng?: number,
): Origin | undefined {
  if (originId === MY_LOCATION_ID) {
    if (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      return myLocationOrigin(lat, lng, label)
    }
    return undefined
  }
  return ORIGINS.find((item) => item.id === originId)
}
