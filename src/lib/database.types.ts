// Generated from the live Supabase project (wybpprdunzrzyzsbiarv) via
// `mcp__Supabase__generate_typescript_types`, Phase 3. Regenerate whenever
// the schema changes — do not hand-edit.
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
          name: string;
          updated_at: string;
        };
        Insert: {
          coverage_depth_label?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['areas']['Insert']>;
        Relationships: [];
      };
      bookmarks: {
        Row: { created_at: string; id: string; place_id: string; user_id: string };
        Insert: { created_at?: string; id?: string; place_id: string; user_id: string };
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
          created_at: string;
          eat_place_id: string;
          explore_place_id: string;
          id: string;
          name: string | null;
          share_token: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          eat_place_id: string;
          explore_place_id: string;
          id?: string;
          name?: string | null;
          share_token?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['plans']['Insert']>;
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
          id: string;
          is_suspended: boolean;
          notification_prefs: Json;
          phone: string | null;
          privacy_prefs: Json;
          ranking_weight: number;
          role: string;
          updated_at: string;
        };
        Insert: {
          admin_tier?: string | null;
          can_access_location_history?: boolean;
          can_override_ranking?: boolean;
          created_at?: string;
          display_name?: string | null;
          home_area_id?: string | null;
          id: string;
          is_suspended?: boolean;
          notification_prefs?: Json;
          phone?: string | null;
          privacy_prefs?: Json;
          ranking_weight?: number;
          role?: string;
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
      fn_admin_adjust_contributor_weight: {
        Args: { p_new_weight: number; p_reason: string; p_target_user_id: string };
        Returns: string;
      };
      fn_admin_capture_rank_snapshot: { Args: Record<string, never>; Returns: number };
      fn_admin_count_ranked_entries: { Args: Record<string, never>; Returns: number };
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
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_admin_tier: { Args: { p_tier: string }; Returns: boolean };
      owns_verified_claim: { Args: { p_place_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
