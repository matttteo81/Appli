import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/** Les sections qui portent un badge de nouveautés (accueil + onglets). */
export type HomeSection = 'wishlist' | 'agenda' | 'notes' | 'journal' | 'messages' | 'album';

const TABLE: Record<HomeSection, string> = {
  wishlist: 'wishes',
  agenda: 'events',
  notes: 'love_notes',
  journal: 'memories',
  messages: 'messages',
  album: 'photos',
};

const seenKey = (s: HomeSection) => `fil_seen_${s}`;

/** Marque une section comme « vue » maintenant (appelé à l'ouverture de l'écran). */
export async function markSeen(section: HomeSection) {
  try {
    await AsyncStorage.setItem(seenKey(section), new Date().toISOString());
  } catch {}
}

async function countNew(section: HomeSection, coupleId: string, partnerId: string): Promise<number> {
  let since = '1970-01-01T00:00:00Z';
  try {
    const v = await AsyncStorage.getItem(seenKey(section));
    if (v) since = v;
  } catch {}
  const { count } = await supabase
    .from(TABLE[section])
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .eq('author_id', partnerId)
    .gt('created_at', since);
  return count ?? 0;
}

/**
 * Nombre de nouveautés ajoutées par ta moitié dans chaque section depuis ta
 * dernière visite. Sert à afficher un petit badge sur les tuiles de l'accueil.
 */
export async function loadHomeBadges(
  coupleId: string,
  partnerId: string | null | undefined,
): Promise<Record<HomeSection, number>> {
  const empty = { wishlist: 0, agenda: 0, notes: 0, journal: 0, messages: 0, album: 0 };
  if (!partnerId) return empty;
  const sections: HomeSection[] = ['wishlist', 'agenda', 'notes', 'journal'];
  const entries = await Promise.all(
    sections.map(async (s) => [s, await countNew(s, coupleId, partnerId)] as const),
  );
  return { ...empty, ...Object.fromEntries(entries) };
}

/** Non-lus des onglets (Messages, Album) : contenu ajouté par ta moitié. */
export async function loadTabBadges(
  coupleId: string,
  partnerId: string | null | undefined,
): Promise<{ messages: number; album: number }> {
  if (!partnerId) return { messages: 0, album: 0 };
  const [messages, album] = await Promise.all([
    countNew('messages', coupleId, partnerId),
    countNew('album', coupleId, partnerId),
  ]);
  return { messages, album };
}
