export type City = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
};

/**
 * Liste de villes fréquentes (nom, pays, coordonnées, fuseau horaire IANA).
 * On peut en ajouter facilement. La recherche se fait sur le nom/pays.
 */
export const CITIES: City[] = [
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
  { name: 'Lyon', country: 'France', lat: 45.764, lng: 4.8357, timezone: 'Europe/Paris' },
  { name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698, timezone: 'Europe/Paris' },
  { name: 'Bordeaux', country: 'France', lat: 44.8378, lng: -0.5792, timezone: 'Europe/Paris' },
  { name: 'Lille', country: 'France', lat: 50.6292, lng: 3.0573, timezone: 'Europe/Paris' },
  { name: 'Toulouse', country: 'France', lat: 43.6047, lng: 1.4442, timezone: 'Europe/Paris' },
  { name: 'Nice', country: 'France', lat: 43.7102, lng: 7.262, timezone: 'Europe/Paris' },
  { name: 'Nantes', country: 'France', lat: 47.2184, lng: -1.5536, timezone: 'Europe/Paris' },
  { name: 'Strasbourg', country: 'France', lat: 48.5734, lng: 7.7521, timezone: 'Europe/Paris' },
  { name: 'Rennes', country: 'France', lat: 48.1173, lng: -1.6778, timezone: 'Europe/Paris' },
  { name: 'Bruxelles', country: 'Belgique', lat: 50.8503, lng: 4.3517, timezone: 'Europe/Brussels' },
  { name: 'Genève', country: 'Suisse', lat: 46.2044, lng: 6.1432, timezone: 'Europe/Zurich' },
  { name: 'Zurich', country: 'Suisse', lat: 47.3769, lng: 8.5417, timezone: 'Europe/Zurich' },
  { name: 'Londres', country: 'Royaume-Uni', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
  { name: 'Madrid', country: 'Espagne', lat: 40.4168, lng: -3.7038, timezone: 'Europe/Madrid' },
  { name: 'Barcelone', country: 'Espagne', lat: 41.3874, lng: 2.1686, timezone: 'Europe/Madrid' },
  { name: 'Lisbonne', country: 'Portugal', lat: 38.7223, lng: -9.1393, timezone: 'Europe/Lisbon' },
  { name: 'Rome', country: 'Italie', lat: 41.9028, lng: 12.4964, timezone: 'Europe/Rome' },
  { name: 'Milan', country: 'Italie', lat: 45.4642, lng: 9.19, timezone: 'Europe/Rome' },
  { name: 'Berlin', country: 'Allemagne', lat: 52.52, lng: 13.405, timezone: 'Europe/Berlin' },
  { name: 'Munich', country: 'Allemagne', lat: 48.1351, lng: 11.582, timezone: 'Europe/Berlin' },
  { name: 'Amsterdam', country: 'Pays-Bas', lat: 52.3676, lng: 4.9041, timezone: 'Europe/Amsterdam' },
  { name: 'Vienne', country: 'Autriche', lat: 48.2082, lng: 16.3738, timezone: 'Europe/Vienna' },
  { name: 'Athènes', country: 'Grèce', lat: 37.9838, lng: 23.7275, timezone: 'Europe/Athens' },
  { name: 'Stockholm', country: 'Suède', lat: 59.3293, lng: 18.0686, timezone: 'Europe/Stockholm' },
  { name: 'Copenhague', country: 'Danemark', lat: 55.6761, lng: 12.5683, timezone: 'Europe/Copenhagen' },
  { name: 'Dublin', country: 'Irlande', lat: 53.3498, lng: -6.2603, timezone: 'Europe/Dublin' },
  { name: 'Varsovie', country: 'Pologne', lat: 52.2297, lng: 21.0122, timezone: 'Europe/Warsaw' },
  { name: 'Montréal', country: 'Canada', lat: 45.5019, lng: -73.5674, timezone: 'America/Toronto' },
  { name: 'Québec', country: 'Canada', lat: 46.8139, lng: -71.208, timezone: 'America/Toronto' },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, timezone: 'America/Toronto' },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207, timezone: 'America/Vancouver' },
  { name: 'New York', country: 'États-Unis', lat: 40.7128, lng: -74.006, timezone: 'America/New_York' },
  { name: 'Boston', country: 'États-Unis', lat: 42.3601, lng: -71.0589, timezone: 'America/New_York' },
  { name: 'Chicago', country: 'États-Unis', lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago' },
  { name: 'Los Angeles', country: 'États-Unis', lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles' },
  { name: 'San Francisco', country: 'États-Unis', lat: 37.7749, lng: -122.4194, timezone: 'America/Los_Angeles' },
  { name: 'Miami', country: 'États-Unis', lat: 25.7617, lng: -80.1918, timezone: 'America/New_York' },
  { name: 'Mexico', country: 'Mexique', lat: 19.4326, lng: -99.1332, timezone: 'America/Mexico_City' },
  { name: 'São Paulo', country: 'Brésil', lat: -23.5505, lng: -46.6333, timezone: 'America/Sao_Paulo' },
  { name: 'Buenos Aires', country: 'Argentine', lat: -34.6037, lng: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
  { name: 'Dakar', country: 'Sénégal', lat: 14.7167, lng: -17.4677, timezone: 'Africa/Dakar' },
  { name: 'Abidjan', country: "Côte d'Ivoire", lat: 5.36, lng: -4.0083, timezone: 'Africa/Abidjan' },
  { name: 'Casablanca', country: 'Maroc', lat: 33.5731, lng: -7.5898, timezone: 'Africa/Casablanca' },
  { name: 'Tunis', country: 'Tunisie', lat: 36.8065, lng: 10.1815, timezone: 'Africa/Tunis' },
  { name: 'Alger', country: 'Algérie', lat: 36.7538, lng: 3.0588, timezone: 'Africa/Algiers' },
  { name: 'Le Caire', country: 'Égypte', lat: 30.0444, lng: 31.2357, timezone: 'Africa/Cairo' },
  { name: 'Dubaï', country: 'Émirats', lat: 25.2048, lng: 55.2708, timezone: 'Asia/Dubai' },
  { name: 'Istanbul', country: 'Turquie', lat: 41.0082, lng: 28.9784, timezone: 'Europe/Istanbul' },
  { name: 'Moscou', country: 'Russie', lat: 55.7558, lng: 37.6173, timezone: 'Europe/Moscow' },
  { name: 'Bombay', country: 'Inde', lat: 19.076, lng: 72.8777, timezone: 'Asia/Kolkata' },
  { name: 'Bangkok', country: 'Thaïlande', lat: 13.7563, lng: 100.5018, timezone: 'Asia/Bangkok' },
  { name: 'Singapour', country: 'Singapour', lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore' },
  { name: 'Hong Kong', country: 'Chine', lat: 22.3193, lng: 114.1694, timezone: 'Asia/Hong_Kong' },
  { name: 'Shanghai', country: 'Chine', lat: 31.2304, lng: 121.4737, timezone: 'Asia/Shanghai' },
  { name: 'Pékin', country: 'Chine', lat: 39.9042, lng: 116.4074, timezone: 'Asia/Shanghai' },
  { name: 'Tokyo', country: 'Japon', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
  { name: 'Séoul', country: 'Corée du Sud', lat: 37.5665, lng: 126.978, timezone: 'Asia/Seoul' },
  { name: 'Sydney', country: 'Australie', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' },
  { name: 'Melbourne', country: 'Australie', lat: -37.8136, lng: 144.9631, timezone: 'Australia/Melbourne' },
  { name: 'Auckland', country: 'Nouvelle-Zélande', lat: -36.8485, lng: 174.7633, timezone: 'Pacific/Auckland' },
];

/** Recherche insensible aux accents/majuscules sur le nom et le pays. */
export function searchCities(query: string): City[] {
  const q = normalize(query);
  if (q.length === 0) return CITIES.slice(0, 12);
  return CITIES.filter(
    (c) => normalize(c.name).includes(q) || normalize(c.country).includes(q),
  ).slice(0, 20);
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
