// Nagorik Voice: Location & Distance calculation utilities

export interface UserCoords {
  lat: number
  lng: number
  accuracy?: number
  isSimulated?: boolean
  label?: string
}

export const DHAKA_FALLBACK_LOCATION: UserCoords = {
  lat: 23.8103,
  lng: 90.4125,
  label: 'Dhaka (Default)'
}

export const DHAKA_AREAS: Record<string, { lat: number; lng: number }> = {
  Uttara: { lat: 23.8728, lng: 90.3959 },
  Mirpur: { lat: 23.8071, lng: 90.3686 },
  Banani: { lat: 23.7937, lng: 90.4043 },
  Gulshan: { lat: 23.7925, lng: 90.4078 },
  Dhanmondi: { lat: 23.7465, lng: 90.3760 },
  Mohammadpur: { lat: 23.7658, lng: 90.3584 },
  Motijheel: { lat: 23.7330, lng: 90.4172 },
  Badda: { lat: 23.7805, lng: 90.4267 }
}

/**
 * Calculates great-circle distance between two points in kilometers (Haversine formula).
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Formats distance into readable meter / kilometer string.
 * Example: 0.25 -> "250 m away", 3.4 -> "3.4 km away"
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.max(10, Math.round(distanceKm * 1000))
    return `${meters} m away`
  }
  return `${distanceKm.toFixed(1)} km away`
}

/**
 * Requests the browser's current location with fallback to Dhaka.
 */
export function getUserLocation(): Promise<UserCoords> {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ ...DHAKA_FALLBACK_LOCATION, isSimulated: true })
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          isSimulated: false,
          label: 'Live GPS'
        })
      },
      _err => {
        // Fallback to Dhaka coordinates if denied or timed out
        resolve({ ...DHAKA_FALLBACK_LOCATION, isSimulated: true })
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    )
  })
}
