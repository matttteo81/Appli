/**
 * Description TypeScript de notre base de données Supabase.
 *
 * Ça sert à deux choses : l'autocomplétion quand on écrit des requêtes, et
 * la détection d'erreurs (ex. un champ mal orthographié). La structure ici
 * correspond exactement au fichier SQL `supabase/migrations/0001_init.sql`.
 */

/** Un « couple » : le lien entre les deux partenaires. */
export type Couple = {
  id: string;
  invite_code: string;
  reunion_date: string | null; // date des retrouvailles (ISO) ou null
  created_at: string;
};

/** Le profil d'un·e partenaire (lié à son compte). */
export type Profile = {
  id: string; // = identifiant du compte (auth.users.id)
  display_name: string | null;
  city_id: string | null; // identifiant de ville (voir src/lib/cities.ts)
  expo_push_token: string | null; // jeton pour les notifications push
  couple_id: string | null;
  created_at: string;
};

/** Un petit mot / post-it partagé. */
export type Note = {
  id: string;
  couple_id: string;
  author_id: string;
  content: string;
  color: string;
  created_at: string;
};

/** Un rituel à cocher ensemble. */
export type Ritual = {
  id: string;
  couple_id: string;
  title: string;
  emoji: string | null;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  created_at: string;
};

/** L'oiseau virtuel partagé (un seul par couple). */
export type Bird = {
  couple_id: string;
  feed_count: number;
  last_fed_at: string | null;
  created_at: string;
};

/** Une photo de l'album partagé. */
export type Photo = {
  id: string;
  couple_id: string;
  author_id: string;
  storage_path: string; // chemin dans le bucket Supabase Storage
  caption: string | null;
  created_at: string;
};

/** Un morceau de la playlist partagée. */
export type Song = {
  id: string;
  couple_id: string;
  author_id: string;
  title: string;
  artist: string | null;
  created_at: string;
};

/** Un « Tu me manques » envoyé (déclenche le popup en temps réel). */
export type MissYou = {
  id: string;
  couple_id: string;
  sender_id: string;
  message: string | null;
  created_at: string;
};

/**
 * Petit utilitaire : un type d'« insertion » = les colonnes obligatoires,
 * les colonnes avec valeur par défaut devenant optionnelles.
 */
type Insert<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

/** Le type global attendu par le client Supabase. */
export type Database = {
  public: {
    Tables: {
      couples: {
        Row: Couple;
        Insert: Insert<Couple, 'id' | 'created_at' | 'reunion_date'>;
        Update: Partial<Couple>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Insert<
          Profile,
          'display_name' | 'city_id' | 'expo_push_token' | 'couple_id' | 'created_at'
        >;
        Update: Partial<Profile>;
        Relationships: [];
      };
      notes: {
        Row: Note;
        Insert: Insert<Note, 'id' | 'color' | 'created_at'>;
        Update: Partial<Note>;
        Relationships: [];
      };
      rituals: {
        Row: Ritual;
        Insert: Insert<
          Ritual,
          'id' | 'emoji' | 'done' | 'done_by' | 'done_at' | 'created_at'
        >;
        Update: Partial<Ritual>;
        Relationships: [];
      };
      bird: {
        Row: Bird;
        Insert: Insert<Bird, 'feed_count' | 'last_fed_at' | 'created_at'>;
        Update: Partial<Bird>;
        Relationships: [];
      };
      photos: {
        Row: Photo;
        Insert: Insert<Photo, 'id' | 'caption' | 'created_at'>;
        Update: Partial<Photo>;
        Relationships: [];
      };
      songs: {
        Row: Song;
        Insert: Insert<Song, 'id' | 'artist' | 'created_at'>;
        Update: Partial<Song>;
        Relationships: [];
      };
      miss_you: {
        Row: MissYou;
        Insert: Insert<MissYou, 'id' | 'message' | 'created_at'>;
        Update: Partial<MissYou>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_couple: { Args: Record<string, never>; Returns: Couple };
      join_couple: { Args: { p_code: string }; Returns: Couple };
      feed_bird: { Args: Record<string, never>; Returns: Bird };
      my_couple_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
