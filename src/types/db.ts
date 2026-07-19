/**
 * Types de la base de données Wingo (échange linguistique).
 * Écrits à la main pour rester simples ; reflètent supabase/hellotalk/schema.sql.
 */
import type { LearningLang } from '../lib/languages';

export type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  bio: string | null;
  native_langs: string[];
  learning_langs: LearningLang[];
  interests: string[];
  city_name: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  push_token: string | null;
  onboarded: boolean;
  last_active: string;
  created_at: string;
  updated_at: string;
};

/** Ligne renvoyée par la RPC discover_partners (profil + distance). */
export type DiscoveredPartner = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  bio: string | null;
  native_langs: string[];
  learning_langs: LearningLang[];
  interests: string[];
  city_name: string | null;
  country_code: string | null;
  last_active: string;
  distance_km: number | null;
};

export type Conversation = {
  id: string;
  created_at: string;
  last_message_at: string;
};

export type ConversationMember = {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
};

export type MessageKind = 'text' | 'voice' | 'correction';

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: MessageKind;
  body: string | null;
  translation: string | null;
  audio_path: string | null;
  audio_ms: number | null;
  corrects_id: string | null;
  created_at: string;
};

export type RoomLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';

export type VoiceRoom = {
  id: string;
  host_id: string;
  title: string;
  language: string;
  level: RoomLevel;
  topic: string | null;
  is_live: boolean;
  max_speakers: number;
  created_at: string;
};

export type RoomRole = 'host' | 'speaker' | 'listener';

export type RoomParticipant = {
  room_id: string;
  user_id: string;
  role: RoomRole;
  joined_at: string;
};

/**
 * Schéma minimal pour typer le client Supabase. On garde volontairement
 * `Insert`/`Update` souples (Partial) pour ne pas alourdir le code applicatif.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation>;
        Update: Partial<Conversation>;
        Relationships: [];
      };
      conversation_members: {
        Row: ConversationMember;
        Insert: { conversation_id: string; user_id: string; last_read_at?: string };
        Update: Partial<ConversationMember>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & {
          conversation_id: string;
          sender_id: string;
        };
        Update: Partial<Message>;
        Relationships: [];
      };
      voice_rooms: {
        Row: VoiceRoom;
        Insert: Partial<VoiceRoom> & {
          host_id: string;
          title: string;
          language: string;
        };
        Update: Partial<VoiceRoom>;
        Relationships: [];
      };
      room_participants: {
        Row: RoomParticipant;
        Insert: {
          room_id: string;
          user_id: string;
          role?: RoomRole;
          joined_at?: string;
        };
        Update: Partial<RoomParticipant>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_or_create_conversation: {
        Args: { p_other: string };
        Returns: string;
      };
      discover_partners: {
        Args: {
          p_lat?: number | null;
          p_lng?: number | null;
          p_speaks?: string | null;
          p_limit?: number;
        };
        Returns: DiscoveredPartner[];
      };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Record<string, never>;
  };
};
