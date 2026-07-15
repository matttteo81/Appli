/**
 * Petite liste de villes du monde, avec leurs coordonnées et leur fuseau
 * horaire (format « IANA », ex. "Europe/Paris"). On l'utilise pour :
 *  - la carte (placer chaque partenaire) ;
 *  - la distance entre les deux ;
 *  - l'heure locale de chacun sur l'écran d'accueil (« ciel jumeau »).
 *
 * Tu peux en ajouter librement : garde le même format.
 */
export type City = {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string; // ex. "Europe/Paris"
};

export const CITIES: City[] = [
  { id: 'paris', name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { id: 'lyon', name: 'Lyon', country: 'France', latitude: 45.764, longitude: 4.8357, timezone: 'Europe/Paris' },
  { id: 'marseille', name: 'Marseille', country: 'France', latitude: 43.2965, longitude: 5.3698, timezone: 'Europe/Paris' },
  { id: 'bordeaux', name: 'Bordeaux', country: 'France', latitude: 44.8378, longitude: -0.5792, timezone: 'Europe/Paris' },
  { id: 'toulouse', name: 'Toulouse', country: 'France', latitude: 43.6047, longitude: 1.4442, timezone: 'Europe/Paris' },
  { id: 'lille', name: 'Lille', country: 'France', latitude: 50.6292, longitude: 3.0573, timezone: 'Europe/Paris' },
  { id: 'nantes', name: 'Nantes', country: 'France', latitude: 47.2184, longitude: -1.5536, timezone: 'Europe/Paris' },
  { id: 'nice', name: 'Nice', country: 'France', latitude: 43.7102, longitude: 7.262, timezone: 'Europe/Paris' },
  { id: 'strasbourg', name: 'Strasbourg', country: 'France', latitude: 48.5734, longitude: 7.7521, timezone: 'Europe/Paris' },
  { id: 'bruxelles', name: 'Bruxelles', country: 'Belgique', latitude: 50.8503, longitude: 4.3517, timezone: 'Europe/Brussels' },
  { id: 'geneve', name: 'Genève', country: 'Suisse', latitude: 46.2044, longitude: 6.1432, timezone: 'Europe/Zurich' },
  { id: 'londres', name: 'Londres', country: 'Royaume-Uni', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { id: 'madrid', name: 'Madrid', country: 'Espagne', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
  { id: 'barcelone', name: 'Barcelone', country: 'Espagne', latitude: 41.3874, longitude: 2.1686, timezone: 'Europe/Madrid' },
  { id: 'lisbonne', name: 'Lisbonne', country: 'Portugal', latitude: 38.7223, longitude: -9.1393, timezone: 'Europe/Lisbon' },
  { id: 'rome', name: 'Rome', country: 'Italie', latitude: 41.9028, longitude: 12.4964, timezone: 'Europe/Rome' },
  { id: 'milan', name: 'Milan', country: 'Italie', latitude: 45.4642, longitude: 9.19, timezone: 'Europe/Rome' },
  { id: 'berlin', name: 'Berlin', country: 'Allemagne', latitude: 52.52, longitude: 13.405, timezone: 'Europe/Berlin' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Pays-Bas', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam' },
  { id: 'copenhague', name: 'Copenhague', country: 'Danemark', latitude: 55.6761, longitude: 12.5683, timezone: 'Europe/Copenhagen' },
  { id: 'stockholm', name: 'Stockholm', country: 'Suède', latitude: 59.3293, longitude: 18.0686, timezone: 'Europe/Stockholm' },
  { id: 'oslo', name: 'Oslo', country: 'Norvège', latitude: 59.9139, longitude: 10.7522, timezone: 'Europe/Oslo' },
  { id: 'varsovie', name: 'Varsovie', country: 'Pologne', latitude: 52.2297, longitude: 21.0122, timezone: 'Europe/Warsaw' },
  { id: 'athenes', name: 'Athènes', country: 'Grèce', latitude: 37.9838, longitude: 23.7275, timezone: 'Europe/Athens' },
  { id: 'istanbul', name: 'Istanbul', country: 'Turquie', latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul' },
  { id: 'moscou', name: 'Moscou', country: 'Russie', latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' },
  { id: 'dubai', name: 'Dubaï', country: 'Émirats', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { id: 'telaviv', name: 'Tel Aviv', country: 'Israël', latitude: 32.0853, longitude: 34.7818, timezone: 'Asia/Jerusalem' },
  { id: 'lecaire', name: 'Le Caire', country: 'Égypte', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo' },
  { id: 'casablanca', name: 'Casablanca', country: 'Maroc', latitude: 33.5731, longitude: -7.5898, timezone: 'Africa/Casablanca' },
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', latitude: 14.7167, longitude: -17.4677, timezone: 'Africa/Dakar' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', latitude: 6.5244, longitude: 3.3792, timezone: 'Africa/Lagos' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'Afrique du Sud', latitude: -26.2041, longitude: 28.0473, timezone: 'Africa/Johannesburg' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', latitude: -1.2921, longitude: 36.8219, timezone: 'Africa/Nairobi' },
  { id: 'newyork', name: 'New York', country: 'États-Unis', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { id: 'washington', name: 'Washington', country: 'États-Unis', latitude: 38.9072, longitude: -77.0369, timezone: 'America/New_York' },
  { id: 'chicago', name: 'Chicago', country: 'États-Unis', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' },
  { id: 'denver', name: 'Denver', country: 'États-Unis', latitude: 39.7392, longitude: -104.9903, timezone: 'America/Denver' },
  { id: 'losangeles', name: 'Los Angeles', country: 'États-Unis', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
  { id: 'sanfrancisco', name: 'San Francisco', country: 'États-Unis', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles' },
  { id: 'seattle', name: 'Seattle', country: 'États-Unis', latitude: 47.6062, longitude: -122.3321, timezone: 'America/Los_Angeles' },
  { id: 'miami', name: 'Miami', country: 'États-Unis', latitude: 25.7617, longitude: -80.1918, timezone: 'America/New_York' },
  { id: 'montreal', name: 'Montréal', country: 'Canada', latitude: 45.5017, longitude: -73.5673, timezone: 'America/Toronto' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver' },
  { id: 'mexico', name: 'Mexico', country: 'Mexique', latitude: 19.4326, longitude: -99.1332, timezone: 'America/Mexico_City' },
  { id: 'bogota', name: 'Bogota', country: 'Colombie', latitude: 4.711, longitude: -74.0721, timezone: 'America/Bogota' },
  { id: 'lima', name: 'Lima', country: 'Pérou', latitude: -12.0464, longitude: -77.0428, timezone: 'America/Lima' },
  { id: 'santiago', name: 'Santiago', country: 'Chili', latitude: -33.4489, longitude: -70.6693, timezone: 'America/Santiago' },
  { id: 'buenosaires', name: 'Buenos Aires', country: 'Argentine', latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
  { id: 'saopaulo', name: 'São Paulo', country: 'Brésil', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo' },
  { id: 'riodejaneiro', name: 'Rio de Janeiro', country: 'Brésil', latitude: -22.9068, longitude: -43.1729, timezone: 'America/Sao_Paulo' },
  { id: 'delhi', name: 'New Delhi', country: 'Inde', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
  { id: 'mumbai', name: 'Mumbai', country: 'Inde', latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thaïlande', latitude: 13.7563, longitude: 100.5018, timezone: 'Asia/Bangkok' },
  { id: 'singapour', name: 'Singapour', country: 'Singapour', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore' },
  { id: 'hongkong', name: 'Hong Kong', country: 'Chine', latitude: 22.3193, longitude: 114.1694, timezone: 'Asia/Hong_Kong' },
  { id: 'pekin', name: 'Pékin', country: 'Chine', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { id: 'shanghai', name: 'Shanghai', country: 'Chine', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
  { id: 'seoul', name: 'Séoul', country: 'Corée du Sud', latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japon', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'sydney', name: 'Sydney', country: 'Australie', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australie', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' },
  { id: 'auckland', name: 'Auckland', country: 'Nouvelle-Zélande', latitude: -36.8485, longitude: 174.7633, timezone: 'Pacific/Auckland' },
];

/** Retrouve une ville par son identifiant. */
export function findCity(id: string | null | undefined): City | undefined {
  if (!id) return undefined;
  return CITIES.find((c) => c.id === id);
}

/** Recherche simple par nom ou pays (insensible aux accents/casse). */
export function searchCities(query: string): City[] {
  const q = normalize(query.trim());
  if (!q) return CITIES;
  return CITIES.filter(
    (c) => normalize(c.name).includes(q) || normalize(c.country).includes(q),
  );
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
