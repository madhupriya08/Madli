// Generated from the live Supabase project (wybpprdunzrzyzsbiarv) via
// `mcp__Supabase__generate_typescript_types`, then curated. Not a verbatim
// generator dump, and it has not been one for a while: `published_picks.Row`
// is aliased to the places Row, no-arg functions use
// `Args: Record<string, never>` rather than the generator's `Args: never`, and
// `fn_admin_attach_google_place` (added 20260825120000) is absent. Replacing
// this wholesale is worth doing, but it is a real change — a verbatim dump
// drops lat/lng/google_place_id from `published_picks`, which the view really
// does lack — so it deserves its own commit and its own typecheck.
//
// The `google_place_rankings` table, `fn_rank_google_place`,
// `fn_google_place_ranking_counts` and the two new `profiles` columns below
// were checked field-for-field against a real generation taken after
// 20260826120000_google_place_rankings.sql was applied. They match, with one
// deliberate difference: the generator types optional function args as
// `p_lat?: number`, and these allow `| null` too, because passing an explicit
// SQL NULL is meaningful here — a ranked place may genuinely have no
// coordinates.
//
// `fn_area_door_counts` (20260828100000) is hand-added the same way, not yet
// re-verified against a fresh generation — same reasoning as above, this
// file stays curated rather than a raw dump.
//
// `fn_unrank_google_place` (20260830100000) was checked field-for-field
// against a real generation taken after that migration was applied.
//
// `profiles.search_filters` (20260830110000) was likewise checked
// field-for-field against a real generation taken after that migration was
// applied.
//
// `google_place_rankings.types` and `fn_rank_google_place`'s new `p_types`
// argument (20260830120000) were likewise checked field-for-field against a
// real generation taken after that migration was applied.
//
// `plans` (eat_place_id/explore_place_id replaced with anchor_key/
// anchor_name/anchor_lat/anchor_lng), the new `plan_items` table, and
// `fn_add_plan_item` (20260830130000) were likewise checked field-for-field
// against a real generation taken after that migration was applied — same
// deliberate `| null` addition on `fn_add_plan_item`'s optional args as
// `fn_rank_google_place` above, for the same reason (a stop can genuinely
// have no address or coordinates).
//
// `areas.lat`/`areas.lng` (20260827090000) are included below — those were
// verified against a real generation when added.
//
// `bookmarks.note` (20260902100000) was likewise checked field-for-field
// against a real generation taken right after that migration was applied.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          admin_id: string;
          created_at: string;
          detail: Json;
          event_type: string;
          id: string;
          reason: string;
          target_id: string | null;
          target_type: string | null;
        };
        Insert: {
          admin_id: string;
          created_at?: string;
          detail?: Json;
          event_type: string;
          id?: string;
          reason: string;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: Partial<Database['public']['Tables']['admin_audit_log']['Insert']>;
        Relationships: [];
      };
      admin_login_audit_log: {
        Row: {
          attempted_identifier: string;
          created_at: string;
          event_type: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          attempted_identifier: string;
          created_at?: string;
          event_type: string;
          id?: string;
          user_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['admin_login_audit_log']['Insert']>;
        Relationships: [];
      };
      analytics_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          session_id: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          session_id: string;
          user_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>;
        Relationships: [];
      };
      app_config: {
        Row: { description: string | null; key: string; updated_at: string; value: Json };
        Insert: { description?: string | null; key: string; updated_at?: string; value: Json };
        Update: Partial<Database['public']['Tables']['app_config']['Insert']>;
        Relationships: [];
      };
      areas: {
        Row: {
          coverage_depth_label: string | null;
          created_at: string;
          id: string;
          lat: number;
          lng: number;
          name: string;
          updated_at: string;
        };
        Insert: {
          coverage_depth_label?: string | null;
          created_at?: string;
          id?: string;
          lat: number;
          lng: number;
          name: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['areas']['Insert']>;
        Relationships: [];
      };
      bookmarks: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          place_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          place_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['bookmarks']['Insert']>;
        Relationships: [];
      };
      business_claims: {
        Row: {
          business_name: string;
          called_at: string | null;
          called_by: string | null;
          claimed_role: string;
          contact_name: string | null;
          contact_phone: string;
          created_at: string;
          id: string;
          maps_link: string;
          place_id: string;
          rejection_reason: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          business_name: string;
          called_at?: string | null;
          called_by?: string | null;
          claimed_role: string;
          contact_name?: string | null;
          contact_phone: string;
          created_at?: string;
          id?: string;
          maps_link: string;
          place_id: string;
          rejection_reason?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['business_claims']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: { created_at: string; id: string; name: string; updated_at: string };
        Insert: { created_at?: string; id?: string; name: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      location_history: {
        Row: {
          action_type: string;
          area_name: string | null;
          created_at: string;
          id: string;
          place_id: string | null;
          user_id: string;
        };
        Insert: {
          action_type: string;
          area_name?: string | null;
          created_at?: string;
          id?: string;
          place_id?: string | null;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['location_history']['Insert']>;
        Relationships: [];
      };
      location_history_access_log: {
        Row: {
          accessed_at: string;
          admin_id: string;
          id: string;
          reason: string;
          target_user_id: string;
        };
        Insert: {
          accessed_at?: string;
          admin_id: string;
          id?: string;
          reason: string;
          target_user_id: string;
        };
        Update: Partial<Database['public']['Tables']['location_history_access_log']['Insert']>;
        Relationships: [];
      };
      place_eat_details: {
        Row: {
          dishes: number | null;
          gem: boolean;
          place_id: string;
          serving_hours: string | null;
          updated_at: string;
          wait_time: string | null;
        };
        Insert: {
          dishes?: number | null;
          gem?: boolean;
          place_id: string;
          serving_hours?: string | null;
          updated_at?: string;
          wait_time?: string | null;
        };
        Update: Partial<Database['public']['Tables']['place_eat_details']['Insert']>;
        Relationships: [];
      };
      place_explore_details: {
        Row: {
          best: string | null;
          crowd_level: string | null;
          place_id: string;
          updated_at: string;
        };
        Insert: {
          best?: string | null;
          crowd_level?: string | null;
          place_id: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['place_explore_details']['Insert']>;
        Relationships: [];
      };
      place_rank_snapshots: {
        Row: {
          captured_at: string;
          category_id: string;
          gem_score: number | null;
          id: string;
          local_rank: number;
          outside_fame_rank: number | null;
          place_id: string;
        };
        Insert: {
          captured_at?: string;
          category_id: string;
          gem_score?: number | null;
          id?: string;
          local_rank: number;
          outside_fame_rank?: number | null;
          place_id: string;
        };
        Update: Partial<Database['public']['Tables']['place_rank_snapshots']['Insert']>;
        Relationships: [];
      };
      places: {
        Row: {
          address: string | null;
          area_id: string | null;
          category_id: string;
          created_at: string;
          created_by: string | null;
          drive: string | null;
          gap_points: number | null;
          gap_tone: string | null;
          history: string | null;
          hours: string | null;
          id: string;
          is_active: boolean;
          locals: number;
          name: string;
          neighborhood: string;
          outside_fame_rank: number | null;
          phone: string | null;
          price_level: string | null;
          reason: string;
          slug: string;
          tags: string[];
          type: string;
          updated_at: string;
          vibe: string | null;
          visitors: number;
        };
        Insert: {
          address?: string | null;
          area_id?: string | null;
          category_id: string;
          created_at?: string;
          created_by?: string | null;
          drive?: string | null;
          gap_points?: number | null;
          gap_tone?: string | null;
          history?: string | null;
          hours?: string | null;
          id?: string;
          is_active?: boolean;
          locals?: number;
          name: string;
          neighborhood: string;
          outside_fame_rank?: number | null;
          phone?: string | null;
          price_level?: string | null;
          reason: string;
          slug: string;
          tags?: string[];
          type: string;
          updated_at?: string;
          vibe?: string | null;
          visitors?: number;
        };
        Update: Partial<Database['public']['Tables']['places']['Insert']>;
        Relationships: [];
      };
      plans: {
        Row: {
          anchor_key: string;
          anchor_lat: number | null;
          anchor_lng: number | null;
          anchor_name: string;
          created_at: string;
          id: string;
          name: string | null;
          share_token: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          anchor_key: string;
          anchor_lat?: number | null;
          anchor_lng?: number | null;
          anchor_name: string;
          created_at?: string;
          id?: string;
          name?: string | null;
          share_token?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['plans']['Insert']>;
        Relationships: [];
      };
      plan_items: {
        Row: {
          address: string | null;
          created_at: string;
          google_place_id: string;
          id: string;
          lat: number | null;
          lng: number | null;
          place_name: string;
          plan_id: string;
          position: number;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          google_place_id: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          place_name: string;
          plan_id: string;
          position: number;
        };
        Update: Partial<Database['public']['Tables']['plan_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'plan_items_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      google_place_rankings: {
        Row: {
          area_text: string | null;
          created_at: string;
          door: string;
          google_place_id: string;
          id: string;
          lat: number | null;
          lng: number | null;
          place_name: string;
          position: number;
          rater_type: string;
          tier: string;
          types: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          area_text?: string | null;
          created_at?: string;
          door: string;
          google_place_id: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          place_name: string;
          position: number;
          rater_type: string;
          tier: string;
          types?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['google_place_rankings']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          admin_tier: string | null;
          can_access_location_history: boolean;
          can_override_ranking: boolean;
          created_at: string;
          display_name: string | null;
          home_area_id: string | null;
          home_area_text: string | null;
          id: string;
          is_suspended: boolean;
          notification_prefs: Json;
          phone: string | null;
          privacy_prefs: Json;
          ranking_weight: number;
          resident_status: string | null;
          role: string;
          search_filters: Json | null;
          updated_at: string;
        };
        Insert: {
          admin_tier?: string | null;
          can_access_location_history?: boolean;
          can_override_ranking?: boolean;
          created_at?: string;
          display_name?: string | null;
          home_area_id?: string | null;
          home_area_text?: string | null;
          id: string;
          is_suspended?: boolean;
          notification_prefs?: Json;
          phone?: string | null;
          privacy_prefs?: Json;
          ranking_weight?: number;
          resident_status?: string | null;
          role?: string;
          search_filters?: Json | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      ranked_entries: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          place_id: string;
          position: number;
          tier: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          place_id: string;
          position: number;
          tier: string;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['ranked_entries']['Insert']>;
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          detail: string | null;
          id: string;
          is_auto_flagged: boolean;
          place_id: string;
          report_type: string;
          reported_by: string | null;
          resolution_outcome: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          detail?: string | null;
          id?: string;
          is_auto_flagged?: boolean;
          place_id: string;
          report_type: string;
          reported_by?: string | null;
          resolution_outcome?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      gem_candidates: {
        Row: {
          category_id: string | null;
          gem_score: number | null;
          local_rank: number | null;
          locals: number | null;
          name: string | null;
          outside_fame_rank: number | null;
          place_id: string | null;
        };
        Relationships: [];
      };
      published_picks: {
        Row: Database['public']['Tables']['places']['Row'];
        Relationships: [];
      };
      ranked_entries_visible: {
        Row: Database['public']['Tables']['ranked_entries']['Row'];
        Relationships: [];
      };
    };
    Functions: {
      can_access_location_history: { Args: Record<string, never>; Returns: boolean };
      can_override_ranking: { Args: Record<string, never>; Returns: boolean };
      fn_add_plan_item: {
        Args: {
          p_address?: string | null;
          p_google_place_id: string;
          p_lat?: number | null;
          p_lng?: number | null;
          p_place_name: string;
          p_plan_id: string;
        };
        Returns: { item_id: string; landed_position: number }[];
      };
      fn_admin_adjust_contributor_weight: {
        Args: { p_new_weight: number; p_reason: string; p_target_user_id: string };
        Returns: string;
      };
      fn_admin_capture_rank_snapshot: { Args: Record<string, never>; Returns: number };
      fn_admin_count_active_users: { Args: { p_days?: number }; Returns: number };
      fn_admin_count_ranked_entries: { Args: Record<string, never>; Returns: number };
      fn_admin_create_admin_account: {
        Args: {
          p_admin_tier: string;
          p_can_access_location_history: boolean;
          p_can_override_ranking: boolean;
          p_reason: string;
          p_user_id: string;
        };
        Returns: string;
      };
      fn_admin_funnel_stats: {
        Args: { p_days?: number };
        Returns: {
          avg_search_to_pick_seconds: number | null;
          comparison1_completed: number;
          comparison1_started: number;
          comparison2_completed: number;
          comparison2_started: number;
          results_shown_events: number;
          sessions_started: number;
          show_two_more_clicks: number;
          signups_completed: number;
          total_picks_shown: number;
        }[];
      };
      fn_admin_list_accounts: {
        Args: Record<string, never>;
        Returns: {
          admin_tier: string | null;
          can_access_location_history: boolean;
          can_override_ranking: boolean;
          email: string;
          id: string;
          is_suspended: boolean;
          last_active_at: string | null;
          role: string;
        }[];
      };
      fn_admin_list_gem_candidates: {
        Args: Record<string, never>;
        Returns: Database['public']['Views']['gem_candidates']['Row'][];
      };
      fn_admin_override_ranking: {
        Args: {
          p_gap_points: number | null;
          p_gap_tone: string;
          p_place_id: string;
          p_reason: string;
        };
        Returns: string;
      };
      fn_admin_plan_stats: {
        Args: Record<string, never>;
        Returns: { shared_plans: number; total_plans: number }[];
      };
      fn_admin_read_location_history: {
        Args: { p_reason: string; p_target_user_id: string };
        Returns: Database['public']['Tables']['location_history']['Row'][];
      };
      fn_create_plan_share_token: { Args: { p_plan_id: string }; Returns: string };
      fn_delete_own_account: { Args: { p_confirm: boolean }; Returns: undefined };
      fn_log_admin_login_attempt: {
        Args: { p_event_type: string; p_identifier: string; p_user_id?: string };
        Returns: undefined;
      };
      fn_log_ranked_visit: {
        Args: {
          p_compare_place_id_1?: string;
          p_compare_place_id_2?: string;
          p_place_id: string;
          p_preferred_new_over_1?: boolean;
          p_preferred_new_over_2?: boolean;
          p_tier: string;
        };
        Returns: { entry_id: string; landed_position: number; total_in_category: number }[];
      };
      fn_area_door_counts: {
        Args: { p_area_id: string };
        Returns: { door: string; place_count: number; ranked_count: number }[];
      };
      fn_google_place_ranking_counts: {
        Args: { p_google_place_ids: string[] };
        Returns: {
          google_place_id: string;
          locals: number;
          locals_disliked: number;
          visitors: number;
          visitors_disliked: number;
        }[];
      };
      fn_rank_google_place: {
        Args: {
          p_area_text?: string | null;
          p_door: string;
          p_google_place_id: string;
          p_lat?: number | null;
          p_lng?: number | null;
          p_place_name: string;
          p_tier: string;
          p_types?: string[];
        };
        Returns: { entry_id: string; landed_position: number; total_in_door: number }[];
      };
      fn_remove_plan_item: {
        Args: { p_google_place_id: string; p_plan_id: string };
        Returns: boolean;
      };
      fn_unrank_google_place: {
        Args: { p_google_place_id: string };
        Returns: undefined;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_admin_tier: { Args: { p_tier: string }; Returns: boolean };
      owns_verified_claim: { Args: { p_place_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
