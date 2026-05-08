/**
 * Calculates the speed between two geographic positions using the Haversine formula.
 * @param {{ lat: number, lng: number }} pos1 - First position
 * @param {{ lat: number, lng: number }} pos2 - Second position
 * @param {number} timeDiffSeconds - Time difference in seconds between the two positions
 * @returns {number} Speed in km/h
 */
export function calculateSpeed(pos1, pos2, timeDiffSeconds) {
  if (timeDiffSeconds === 0) return 0;

  const R = 6371; // Earth's radius in km
  const toRad = (deg) => deg * (Math.PI / 180);

  const dLat = toRad(pos2.lat - pos1.lat);
  const dLon = toRad(pos2.lng - pos1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pos1.lat)) *
      Math.cos(toRad(pos2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // distance in km

  const speedKmh = (distance / timeDiffSeconds) * 3600;
  return speedKmh;
}
