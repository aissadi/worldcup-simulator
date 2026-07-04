import { createClient } from "@supabase/supabase-js";

export type PredictionPicks = Record<string, string>;

export type PredictionRow = {
  id: string;
  player_name: string;
  champion: string | null;
  picks: PredictionPicks;
  correct_picks: number;
  total_completed_matches: number;
  created_at: string;
};

type Database = {
  public: {
    Tables: {
      predictions: {
        Row: PredictionRow;
        Insert: {
          id?: string;
          player_name: string;
          champion?: string | null;
          picks: PredictionPicks;
          correct_picks?: number;
          total_completed_matches?: number;
          created_at?: string;
        };
        Update: Partial<Omit<PredictionRow, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;
