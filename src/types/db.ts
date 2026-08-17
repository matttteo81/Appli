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
  together_photo_path: string | null;
  streak_count: number;
  streak_last: string | null;
  created_at: string;
};

export type Wish = {
  id: string;
  couple_id: string;
  author_id: string | null;
  text: string;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  created_at: string;
};

export type LoveNote = {
  id: string;
  couple_id: string;
  author_id: string | null;
  to_id: string | null;
  body: string;
  reveal_at: string | null;
  opened: boolean;
  opened_at: string | null;
  created_at: string;
};

export type CoupleEvent = {
  id: string;
  couple_id: string;
  author_id: string | null;
  title: string;
  emoji: string;
  event_date: string; // YYYY-MM-DD
  event_time: string | null; // 'HH:MM' ou null
  note: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_path: string | null;
  city_name: string | null;
  city_lat: number | null;
  city_lng: number | null;
  auto_location: boolean;
  timezone: string | null;
  push_token: string | null;
  mood_emoji: string | null;
  mood_label: string | null;
  mood_updated_at: string | null;
  last_active: string | null;
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

export type SavedGif = {
  id: string;
  couple_id: string;
  author_id: string | null;
  url: string;
  created_at: string;
};

export type Memory = {
  id: string;
  couple_id: string;
  author_id: string | null;
  title: string | null;
  body: string | null;
  photo_path: string | null;
  memory_date: string; // YYYY-MM-DD
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export type Message = {
  id: string;
  couple_id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  reactions: Record<string, string>;
  reply_to: string | null;
  created_at: string;
};

export type WatchSession = {
  couple_id: string;
  title: string | null;
  is_playing: boolean;
  base_seconds: number;
  base_at: string;
  updated_at: string;
};

export type GameResponse = {
  id: string;
  couple_id: string;
  game: string; // 'qui' | 'know_self' | 'know_guess' | 'q36'
  item_key: string;
  author_id: string;
  value: string;
  created_at: string;
  updated_at: string;
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

export type DrawingStroke = {
  id: string;
  couple_id: string;
  author_id: string | null;
  color: string;
  width: number;
  points: number[][]; // [[x,y],...] normalisés 0..1
  board: string; // 'free' | 'game'
  created_at: string;
};

export type Pictionary = {
  couple_id: string;
  drawer_id: string | null;
  word: string | null;
  solved: boolean;
  updated_at: string;
};

export type Farm = {
  couple_id: string;
  active_species: string | null;
  active_name: string | null;
  active_feeds: number;
  active_color: number;
  active_fav_fed: number;
  coins: number;
  last_grown_at: string | null;
  created_at: string;
};

export type FarmResident = {
  id: string;
  couple_id: string;
  species: string;
  name: string | null;
  color: number;
  rare: boolean;
  x: number;
  y: number;
  born_at: string;
  grown_at: string;
};

export type FarmInventory = {
  couple_id: string;
  food_id: string;
  qty: number;
};

export type FarmAnimal = {
  id: string;
  couple_id: string;
  species: string;
  feed_count: number;
  is_active: boolean;
  generation: number;
  last_fed_by: string | null;
  last_fed_at: string | null;
  born_at: string;
  grown_at: string | null;
};

export type Photo = {
  id: string;
  couple_id: string;
  author_id: string;
  storage_path: string;
  caption: string | null;
  challenge: string | null;
  lat: number | null;
  lng: number | null;
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
  audio_url: string | null;
  created_at: string;
};

export type Capsule = {
  id: string;
  couple_id: string;
  author_id: string | null;
  author_name: string | null;
  title: string | null;
  message: string | null;
  image_path: string | null;
  open_date: string; // YYYY-MM-DD
  created_at: string;
};

export type ReunionTask = {
  id: string;
  couple_id: string;
  author_id: string | null;
  text: string;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  created_at: string;
};

export type Feedback = {
  id: string;
  couple_id: string | null;
  author_id: string | null;
  author_name: string | null;
  message: string;
  created_at: string;
};

export type Countdown = {
  id: string;
  couple_id: string;
  title: string;
  emoji: string;
  date: string; // YYYY-MM-DD
  created_at: string;
};

export type DailyAnswer = {
  id: string;
  couple_id: string;
  author_id: string;
  question_date: string; // YYYY-MM-DD
  question_text: string;
  answer: string;
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
      farm_animals: TableDef<FarmAnimal>;
      farm: TableDef<Farm>;
      farm_residents: TableDef<FarmResident>;
      farm_inventory: TableDef<FarmInventory>;
      drawing_strokes: TableDef<DrawingStroke>;
      pictionary: TableDef<Pictionary>;
      photos: TableDef<Photo>;
      playlist_tracks: TableDef<Track>;
      nudges: TableDef<Nudge>;
      countdowns: TableDef<Countdown>;
      daily_answers: TableDef<DailyAnswer>;
      messages: TableDef<Message>;
      memories: TableDef<Memory>;
      wishes: TableDef<Wish>;
      love_notes: TableDef<LoveNote>;
      events: TableDef<CoupleEvent>;
      game_responses: TableDef<GameResponse>;
      watch_sessions: TableDef<WatchSession>;
      saved_gifs: TableDef<SavedGif>;
      feedback: TableDef<Feedback>;
      reunion_tasks: TableDef<ReunionTask>;
      capsules: TableDef<Capsule>;
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
      ensure_farm: {
        Args: { p_couple: string };
        Returns: FarmAnimal;
      };
      feed_animal: {
        Args: { p_animal: string };
        Returns: FarmAnimal;
      };
      farm_rebirth: {
        Args: { p_animal: string };
        Returns: FarmAnimal;
      };
      react_to_message: {
        Args: { p_message: string; p_emoji: string };
        Returns: void;
      };
      touch_streak: {
        Args: { p_couple: string };
        Returns: Couple;
      };
      delete_my_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      pf_ensure: { Args: { p_couple: string }; Returns: Farm };
      pf_feed: { Args: { p_couple: string }; Returns: Farm };
      pf_name: { Args: { p_couple: string; p_name: string }; Returns: Farm };
      pf_new_egg: { Args: { p_couple: string }; Returns: Farm };
      pf_daily_login: { Args: { p_couple: string }; Returns: Farm };
      pf_market_open: { Args: { p_couple: string }; Returns: boolean };
      pf_buy_food: { Args: { p_couple: string; p_food: string }; Returns: Farm };
      pf_give_food: { Args: { p_couple: string; p_food: string }; Returns: Farm };
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
