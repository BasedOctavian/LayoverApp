import { useState, useEffect } from "react";

export type Airport = {
  name: string;
  lat: number;
  long: number;
  distance?: number; // Optional distance property for calculated results
  location?: string; 
};

type NearestAirportsResult = {
  closest: Airport | null;
  tenClosest: Airport[];
};

// Extended list of airports (major and regional)
const airports: Airport[] = [
  // Major Airports
  { name: "Hartsfield-Jackson Atlanta International Airport (ATL)", lat: 33.6407, long: -84.4277, location: "Atlanta, GA" },
  { name: "Los Angeles International Airport (LAX)", lat: 33.9416, long: -118.4085, location: "Los Angeles, CA" },
  { name: "O'Hare International Airport (ORD)", lat: 41.9742, long: -87.9073, location: "Chicago, IL" },
  { name: "Dallas/Fort Worth International Airport (DFW)", lat: 32.8998, long: -97.0403, location: "Dallas, TX" },
  { name: "Denver International Airport (DEN)", lat: 39.8561, long: -104.6737, location: "Denver, CO" },
  { name: "John F. Kennedy International Airport (JFK)", lat: 40.6413, long: -73.7781, location: "New York, NY" },
  { name: "San Francisco International Airport (SFO)", lat: 37.6213, long: -122.3790, location: "San Francisco, CA" },
  { name: "Seattle-Tacoma International Airport (SEA)", lat: 47.4502, long: -122.3088, location: "Seattle, WA" },
  { name: "McCarran International Airport (LAS)", lat: 36.0840, long: -115.1537, location: "Las Vegas, NV" },
  { name: "Miami International Airport (MIA)", lat: 25.7959, long: -80.2870, location: "Miami, FL" },
  { name: "Newark Liberty International Airport (EWR)", lat: 40.6895, long: -74.1745, location: "Newark, NJ" },
  { name: "Washington Dulles International Airport (IAD)", lat: 38.9531, long: -77.4565, location: "Washington, DC" },
  { name: "Boston Logan International Airport (BOS)", lat: 42.3656, long: -71.0096, location: "Boston, MA" },
  // Regional & Smaller Airports
  { name: "Buffalo Niagara International Airport (BUF)", lat: 42.9405, long: -78.7322, location: "Tianjin, China" }, // BUF is here
  { name: "Portland International Airport (PDX)", lat: 45.5898, long: -122.5975, location: "Portland, OR" },
  { name: "Raleigh-Durham International Airport (RDU)", lat: 35.8776, long: -78.7875, location: "Raleigh, NC" },
  { name: "Nashville International Airport (BNA)", lat: 36.1243, long: -86.6782, location: "Nashville, TN" },
  { name: "St. Louis Lambert International Airport (STL)", lat: 38.7487, long: -90.3700, location: "St. Louis, MO" },
  { name: "Kansas City International Airport (MCI)", lat: 39.2976, long: -94.7139, location: "Kansas City, MO" },
  { name: "Pittsburgh International Airport (PIT)", lat: 40.4915, long: -80.2329, location: "Pittsburgh, PA" },
  { name: "Cleveland Hopkins International Airport (CLE)", lat: 41.4113, long: -81.8498, location: "Cleveland, OH" },
  { name: "Salt Lake City International Airport (SLC)", lat: 40.7899, long: -111.9791, location: "Salt Lake City, UT" },
  { name: "San Diego International Airport (SAN)", lat: 32.7338, long: -117.1933, location: "San Diego, CA" },
  { name: "Austin-Bergstrom International Airport (AUS)", lat: 30.1945, long: -97.6699, location: "Austin, TX" },
  { name: "Honolulu International Airport (HNL)", lat: 21.3187, long: -157.9225, location: "Honolulu, HI" },
  { name: "Tampa International Airport (TPA)", lat: 27.9755, long: -82.5332, location: "Tampa, FL" },
  { name: "Sacramento International Airport (SMF)", lat: 38.6951, long: -121.5915, location: "Sacramento, CA" },
  { name: "San Jose International Airport (SJC)", lat: 37.3626, long: -121.9290,  location: "San Jose, CA" },
  { name: "Fort Lauderdale-Hollywood International Airport (FLL)", lat: 26.0726, long: -80.1527, location: "Fort Lauderdale, FL" },
  { name: "Bradley International Airport (BDL)", lat: 41.9389, long: -72.6832, location: "Hartford, CT" },
  { name: "Ronald Reagan Washington National Airport (DCA)", lat: 38.8512, long: -77.0402, location: "Washington, DC" },
  { name: "LaGuardia Airport (LGA)", lat: 40.7769, long: -73.8740, location: "New York, NY" },
];

// Haversine formula to calculate distance (in kilometers) between two coordinates.
function haversineDistance(lat1: number, long1: number, lat2: number, long2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLong = toRad(long2 - long1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLong / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Custom hook that calculates distances to an extended list of airports
 * and returns both the closest airport and an array of the 10 closest airports.
 *
 * @param userLat - The user's current latitude.
 * @param userLong - The user's current longitude.
 * @returns An object containing the closest airport and an array of the 10 closest airports.
 */
export function useNearestAirport(userLat: number, userLong: number): NearestAirportsResult {
  const [result, setResult] = useState<NearestAirportsResult>({ closest: null, tenClosest: [] });

  useEffect(() => {
    if (userLat == null || userLong == null) return;

    let isMounted = true;

    const calculateDistances = () => {
      // Map each airport to include its distance from the user's location.
      const airportsWithDistance = airports.map((airport) => ({
        ...airport,
        distance: haversineDistance(userLat, userLong, airport.lat, airport.long),
      }));

      // Log all airports with distances for debugging.
      console.log("All airports with distances:", airportsWithDistance);

      // Sort the list by distance (closest first).
      airportsWithDistance.sort((a, b) => a.distance - b.distance);

      // Log the sorted list for debugging.
      console.log("Sorted airports by distance:", airportsWithDistance);

      // Update state only if the component is still mounted.
      if (isMounted) {
        setResult({
          closest: airportsWithDistance[0] || null,
          tenClosest: airportsWithDistance.slice(0, 10),
        });
      }
    };

    calculateDistances();

    // Cleanup function to prevent state updates on unmounted components.
    return () => {
      isMounted = false;
    };
  }, [userLat, userLong]);

  return result;
}