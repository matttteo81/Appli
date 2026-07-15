/**
 * Recherche de morceaux via l'API iTunes Search (gratuite, sans clé) et
 * génération des liens « Ouvrir dans » pour les principaux services.
 */

export type TrackResult = {
  title: string;
  artist: string;
  artwork: string | null;
};

/** Recherche des chansons par titre/artiste. */
export async function searchTracks(query: string): Promise<TrackResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url =
      'https://itunes.apple.com/search?media=music&entity=song&limit=20&term=' +
      encodeURIComponent(q);
    const res = await fetch(url);
    const json = await res.json();
    const seen = new Set<string>();
    const out: TrackResult[] = [];
    for (const r of json.results ?? []) {
      const key = `${r.trackName}|${r.artistName}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title: r.trackName,
        artist: r.artistName,
        // On demande une pochette plus grande que la version 100px.
        artwork: r.artworkUrl100
          ? r.artworkUrl100.replace('100x100', '300x300')
          : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Liens pour ouvrir un morceau dans chaque service (par recherche). */
export function openInLinks(title: string, artist: string) {
  const q = encodeURIComponent(`${title} ${artist}`.trim());
  return {
    spotify: `https://open.spotify.com/search/${q}`,
    appleMusic: `https://music.apple.com/search?term=${q}`,
    deezer: `https://www.deezer.com/search/${q}`,
    youtubeMusic: `https://music.youtube.com/search?q=${q}`,
    // Services chinois (pour la moitié en Chine)
    qqMusic: `https://y.qq.com/n/ryqq/search?w=${q}`,
    netease: `https://music.163.com/#/search/m/?s=${q}&type=1`,
  };
}

export const MUSIC_SERVICES: {
  key: keyof ReturnType<typeof openInLinks>;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { key: 'spotify', label: 'Spotify', emoji: '🟢', color: '#1DB954' },
  { key: 'appleMusic', label: 'Apple Music', emoji: '🍎', color: '#FA243C' },
  { key: 'deezer', label: 'Deezer', emoji: '🎧', color: '#A238FF' },
  { key: 'youtubeMusic', label: 'YT Music', emoji: '▶️', color: '#FF0000' },
  { key: 'qqMusic', label: 'QQ Music', emoji: '🐧', color: '#31C27C' },
  { key: 'netease', label: 'NetEase', emoji: '🎵', color: '#C20C0C' },
];
