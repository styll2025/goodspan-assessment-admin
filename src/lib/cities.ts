export const CITY_CLUSTER_KM = 50;

type HubId = 'lisbon' | 'porto' | 'london' | 'berlin';

type Hub = {
  id: HubId;
  display: string;
  lat: number;
  lng: number;
};

type Place = {
  aliases: string[];
  lat: number;
  lng: number;
  hub?: HubId;
  display: string;
};

const HUBS: Record<HubId, Hub> = {
  lisbon: { id: 'lisbon', display: 'Lisbon, Portugal', lat: 38.7223, lng: -9.1393 },
  porto: { id: 'porto', display: 'Porto, Portugal', lat: 41.1579, lng: -8.6291 },
  london: { id: 'london', display: 'London, United Kingdom', lat: 51.5074, lng: -0.1278 },
  berlin: { id: 'berlin', display: 'Berlin, Germany', lat: 52.52, lng: 13.405 },
};

const PLACES: Place[] = [
  { aliases: ['lisbon', 'lisboa'], lat: 38.7223, lng: -9.1393, hub: 'lisbon', display: 'Lisbon, Portugal' },
  { aliases: ['cascais'], lat: 38.6979, lng: -9.4215, hub: 'lisbon', display: 'Cascais, Portugal' },
  { aliases: ['estoril'], lat: 38.7057, lng: -9.3977, hub: 'lisbon', display: 'Estoril, Portugal' },
  { aliases: ['oeiras'], lat: 38.691, lng: -9.3103, hub: 'lisbon', display: 'Oeiras, Portugal' },
  { aliases: ['carcavelos'], lat: 38.681, lng: -9.339, hub: 'lisbon', display: 'Carcavelos, Portugal' },
  { aliases: ['sintra'], lat: 38.8029, lng: -9.3817, hub: 'lisbon', display: 'Sintra, Portugal' },
  { aliases: ['amadora'], lat: 38.7538, lng: -9.2308, hub: 'lisbon', display: 'Amadora, Portugal' },
  { aliases: ['odivelas'], lat: 38.7927, lng: -9.183, hub: 'lisbon', display: 'Odivelas, Portugal' },
  { aliases: ['loures'], lat: 38.8309, lng: -9.1685, hub: 'lisbon', display: 'Loures, Portugal' },
  { aliases: ['almada'], lat: 38.679, lng: -9.1566, hub: 'lisbon', display: 'Almada, Portugal' },
  { aliases: ['caparica', 'costa da caparica', 'costa caparica'], lat: 38.6447, lng: -9.2354, hub: 'lisbon', display: 'Costa da Caparica, Portugal' },
  { aliases: ['seixal'], lat: 38.6403, lng: -9.1014, hub: 'lisbon', display: 'Seixal, Portugal' },
  { aliases: ['barreiro'], lat: 38.6631, lng: -9.0724, hub: 'lisbon', display: 'Barreiro, Portugal' },
  { aliases: ['montijo'], lat: 38.7069, lng: -8.9739, hub: 'lisbon', display: 'Montijo, Portugal' },
  { aliases: ['setubal', 'setúbal'], lat: 38.5244, lng: -8.8882, hub: 'lisbon', display: 'Setúbal, Portugal' },
  { aliases: ['sesimbra'], lat: 38.4446, lng: -9.1015, hub: 'lisbon', display: 'Sesimbra, Portugal' },
  { aliases: ['mafra'], lat: 38.937, lng: -9.327, hub: 'lisbon', display: 'Mafra, Portugal' },
  { aliases: ['ericeira'], lat: 38.963, lng: -9.417, hub: 'lisbon', display: 'Ericeira, Portugal' },
  { aliases: ['porto', 'oporto'], lat: 41.1579, lng: -8.6291, hub: 'porto', display: 'Porto, Portugal' },
  { aliases: ['gaia', 'vila nova de gaia'], lat: 41.1239, lng: -8.6118, hub: 'porto', display: 'Vila Nova de Gaia, Portugal' },
  { aliases: ['matosinhos'], lat: 41.1821, lng: -8.6891, hub: 'porto', display: 'Matosinhos, Portugal' },
  { aliases: ['maia'], lat: 41.2356, lng: -8.6199, hub: 'porto', display: 'Maia, Portugal' },
  { aliases: ['gondomar'], lat: 41.1445, lng: -8.5322, hub: 'porto', display: 'Gondomar, Portugal' },
  { aliases: ['london'], lat: 51.5074, lng: -0.1278, hub: 'london', display: 'London, United Kingdom' },
  { aliases: ['croydon'], lat: 51.3762, lng: -0.0982, hub: 'london', display: 'Croydon, United Kingdom' },
  { aliases: ['greenwich'], lat: 51.4934, lng: 0.0098, hub: 'london', display: 'Greenwich, United Kingdom' },
  { aliases: ['richmond'], lat: 51.4613, lng: -0.3037, hub: 'london', display: 'Richmond, United Kingdom' },
  { aliases: ['berlin'], lat: 52.52, lng: 13.405, hub: 'berlin', display: 'Berlin, Germany' },
  { aliases: ['potsdam'], lat: 52.3906, lng: 13.0645, hub: 'berlin', display: 'Potsdam, Germany' },
];

export function clusterCity(location: string): string {
  const place = findPlace(location);
  if (!place) return displayLocation(location);
  if (place.hub) return HUBS[place.hub].display;
  const nearest = nearestHub(place.lat, place.lng);
  if (nearest && nearest.km <= CITY_CLUSTER_KM) return nearest.hub.display;
  return place.display;
}

export function localCityName(location: string): string {
  const place = findPlace(location);
  if (place) return place.display.split(',')[0];
  const city = location.split(',')[0]?.trim();
  return city || displayLocation(location);
}

export function satelliteCities(locations: string[], hub: string): string[] {
  const hubCity = localCityName(hub).toLowerCase();
  const seen = new Set<string>();
  locations.forEach((location) => {
    const name = localCityName(location);
    if (name.toLowerCase() === hubCity) return;
    seen.add(name);
  });
  return [...seen].sort((a, b) => a.localeCompare(b));
}

function findPlace(location: string): Place | null {
  const full = normalizePlace(location);
  const city = normalizePlace(location.split(',')[0] ?? location);
  if (!full) return null;
  const exact = PLACES.find((place) => place.aliases.some((alias) => alias === city || alias === full));
  if (exact) return exact;
  return PLACES.find((place) => place.aliases.some((alias) => city.includes(alias) || full.includes(alias))) ?? null;
}

function nearestHub(lat: number, lng: number): { hub: Hub; km: number } | null {
  return Object.values(HUBS).reduce<{ hub: Hub; km: number } | null>((best, hub) => {
    const km = haversineKm(lat, lng, hub.lat, hub.lng);
    if (!best || km < best.km) return { hub, km };
    return best;
  }, null);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizePlace(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function displayLocation(location: string): string {
  const trimmed = location.trim();
  return trimmed || 'unspecified';
}
