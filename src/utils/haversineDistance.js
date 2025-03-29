// utils/haversineDistance.js
export function haversineDistance(lat1, long1, lat2, long2) {
    // Convert degrees to radians
    const toRad = (value) => (value * Math.PI) / 180;
  
    // Earth's radius in kilometers
    const R = 6371;
  
    // Differences in coordinates (in radians)
    const dLat = toRad(lat2 - lat1);
    const dLong = toRad(long2 - long1);
  
    // Haversine formula
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLong / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    // Distance in kilometers
    return R * c;
  }