// Hand-maintained to match @supabase/supabase-js's GenericSchema shape.
// Re-generate with `npx supabase gen types typescript` once local/remote
// codegen is available. The schema needs Views/Functions/Enums/CompositeTypes
// and per-table Relationships, or the typed client collapses to `never`.
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
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
        Insert: {
          id?: string;
          date: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          is_open?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["locations"]["Insert"]>;
        Relationships: [];
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
          is_archived: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          category?: string | null;
          is_available?: boolean;
          is_sold_out?: boolean;
          image_url?: string | null;
          sort_order?: number;
          is_archived?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
        Relationships: [];
      };
      daily_performance: {
        Row: {
          id: string;
          location_id: string;
          revenue_cents: number | null;
          customer_count: number | null;
          end_of_day_note: string | null;
          wrapped_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          revenue_cents?: number | null;
          customer_count?: number | null;
          end_of_day_note?: string | null;
          wrapped_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_performance"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "daily_performance_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: true;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_item_stats: {
        Row: {
          id: string;
          location_id: string;
          menu_item_id: string | null;
          item_name: string;
          item_price: number;
          units_sold: number | null;
          was_sold_out: boolean;
        };
        Insert: {
          id?: string;
          location_id: string;
          menu_item_id?: string | null;
          item_name: string;
          item_price: number;
          units_sold?: number | null;
          was_sold_out?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["daily_item_stats"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "daily_item_stats_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_item_stats_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
