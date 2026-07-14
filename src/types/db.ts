/**
 * Types de la base de données, écrits à la main pour rester simples.
 * Ils reflètent supabase/schema.sql.
 */

export type Couple = {
  id: string;
  invite_code: string;
  reunion_date: string | null;
  together_since: string | null;
  home_photo_path: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  city_name: string | null;
  city_lat: number | null;
  city_lng: number | null;
  timezone: string | null;
  push_token: string | null;
  mood_emoji: string | null;
  mood_label: string | null;
  mood_updated_at: string | null;
  couple_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Word = {
  id: string;
  couple_id: string;
  author_id: string;
  body: string;
  color: string;
  created_at: string;
};

export type Ritual = {
  id: string;
  couple_id: string;
  title: string;
  emoji: string;
  done: boolean;
  done_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Pet = {
  couple_id: string;
  feed_count: number;
  last_fed_by: string | null;
  last_fed_at: string | null;
  updated_at: string;
};

export type Photo = {
  id: string;
  couple_id: string;
  author_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export type Track = {
  id: string;
  couple_id: string;
  author_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  created_at: string;
};

export type Nudge = {
  id: string;
  couple_id: string;
  from_id: string;
  to_id: string;
  message: string;
  created_at: string;
};

type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

type TableDef<T> = {
  Row: Row<T>;
  Insert: Insert<T>;
  Update: Update<T>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      couples: TableDef<Couple>;
      profiles: TableDef<Profile>;
      words: TableDef<Word>;
      rituals: TableDef<Ritual>;
      pets: TableDef<Pet>;
      photos: TableDef<Photo>;
      playlist_tracks: TableDef<Track>;
      nudges: TableDef<Nudge>;
    };
    Views: Record<string, never>;
    Functions: {
      current_couple_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      feed_pet: {
        Args: { p_couple: string; p_user: string };
        Returns: Pet;
      };
      create_couple: {
        Args: Record<string, never>;
        Returns: Couple;
      };
      join_couple_by_code: {
        Args: { p_code: string };
        Returns: Couple;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
