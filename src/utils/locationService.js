const mockLocations = [
  { name: 'N Seoul Tower', lat: 37.551169, lng: 126.988226, type: 'famous place' },
  { name: 'Gyeongbokgung Palace', lat: 37.579617, lng: 126.977041, type: 'famous place' },
  { name: 'Dongdaemun Design Plaza', lat: 37.566526, lng: 127.009026, type: 'famous place' },
  { name: 'Lotte World Tower', lat: 37.512597, lng: 127.102526, type: 'famous place' },
  { name: 'Banpo Bridge Rainbow Fountain', lat: 37.515668, lng: 126.995960, type: 'famous place' },
  { name: 'Bukhansan National Park', lat: 37.658253, lng: 126.977931, type: 'famous place' },
  { name: 'Myeong-dong Shopping Street', lat: 37.563656, lng: 126.982928, type: 'famous place' },
  { name: 'Bukchon Hanok Village', lat: 37.582604, lng: 126.983637, type: 'famous place' },
  { name: 'Itaewon', lat: 37.534571, lng: 126.994503, type: 'famous place' },
  { name: 'Jeju Island (Mock Airport)', lat: 33.510414, lng: 126.522253, type: 'famous place' }
];

const transportModes = ['walk', 'car', 'bus', 'metro', 'airplane'];

// Calculate distance between two lat/lng coordinates in km using Haversine formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);  // deg2rad below
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

/**
 * Mocks finding a target location within a 20-minute reach.
 * Uses a mock database of famous places and randomly selects a feasible mode of transport.
 */
export async function getNextTargetLocationAndTransport(currentLoc) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Determine if staying or moving (e.g. 20% chance to stay, 80% chance to move)
  const isStay = Math.random() < 0.2;

  if (isStay) {
    return {
      status: 'stay',
      targetLocation: currentLoc,
      transportation: 'none',
      targetName: 'current location'
    };
  }

  // Filter out the exact same location with a small tolerance
  const availableLocations = mockLocations.filter(loc => 
    getDistanceFromLatLonInKm(currentLoc.lat, currentLoc.lng, loc.lat, loc.lng) > 0.5
  );

  // Pick a random location
  const targetLoc = availableLocations[Math.floor(Math.random() * availableLocations.length)];
  const distance = getDistanceFromLatLonInKm(currentLoc.lat, currentLoc.lng, targetLoc.lat, targetLoc.lng);

  // Pick transport based on distance
  let mode = 'walk';
  if (distance > 200) {
    mode = 'airplane';
  } else if (distance > 15) {
    // Car or metro
    mode = Math.random() > 0.5 ? 'car' : 'metro';
  } else if (distance > 3) {
    mode = Math.random() > 0.5 ? 'bus' : 'car';
  } // Else walk is fine for < 3km in 20 mins (fast walk)

  return {
    status: 'move',
    targetLocation: { lat: targetLoc.lat, lng: targetLoc.lng },
    transportation: mode,
    targetName: targetLoc.name
  };
}
