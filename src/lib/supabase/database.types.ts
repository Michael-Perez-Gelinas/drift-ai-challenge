// Generated via: npx supabase gen types typescript --local
// Re-run after any schema change.
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      locations: {
        Row: {
          id: string;
          date: string;
          address: string;
          lat: number | null;
          lng: number | null;
          note: string | null;
          is_open: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["locations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["locations"]["Insert"]>;
      };
      menu_items: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          category: string | null;
          is_available: boolean;
          is_sold_out: boolean;
          image_url: string | null;
          sort_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["menu_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
      };
    };
  };
}
