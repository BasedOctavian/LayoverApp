// useNearestAirports.js
import { useMemo } from "react";
import { haversineDistance } from "../utils/haversineDistance"; // Assuming this utility is available

export function useNearestAirports(userLocation, allAirports) {
  return useMemo(() => {
    if (!userLocation || allAirports.length === 0) {
      return { closest: null, tenClosest: [] };
    }
    const airportsWithDistance = allAirports.map((airport) => ({
      ...airport,
      distance: haversineDistance(
        userLocation.lat,
        userLocation.long,
        airport.lat,
        airport.long
      ),
    }));
    airportsWithDistance.sort((a, b) => a.distance - b.distance);
    return {
      closest: airportsWithDistance[0] || null,
      tenClosest: airportsWithDistance.slice(0, 10),
    };
  }, [userLocation, allAirports]);
}