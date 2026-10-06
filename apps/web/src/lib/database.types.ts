export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number
          note: string | null
          revoked_at: string | null
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          note?: string | null
          revoked_at?: string | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          note?: string | null
          revoked_at?: string | null
          uses?: number
        }
        Relationships: []
      }
      crew_devices: {
        Row: {
          crew_id: string
          device_key_hash: string | null
          fair_play_accepted_at: string | null
          fair_play_accepted_by: string | null
          fair_play_accepted_by_name: string | null
          traccar_device_id: string | null
          updated_at: string
        }
        Insert: {
          crew_id: string
          device_key_hash?: string | null
          fair_play_accepted_at?: string | null
          fair_play_accepted_by?: string | null
          fair_play_accepted_by_name?: string | null
          traccar_device_id?: string | null
          updated_at?: string
        }
        Update: {
          crew_id?: string
          device_key_hash?: string | null
          fair_play_accepted_at?: string | null
          fair_play_accepted_by?: string | null
          fair_play_accepted_by_name?: string | null
          traccar_device_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_devices_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: true
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          created_at: string
          crew_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crew_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crew_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_purchases: {
        Row: {
          access_code_id: string | null
          amount_cents: number
          created_at: string
          crew_id: string | null
          currency: string
          customer_email: string | null
          id: string
          immediate_start_at: string | null
          paid_at: string | null
          refunded_at: string | null
          refunded_cents: number
          source: string
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          terms_accepted_at: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          access_code_id?: string | null
          amount_cents: number
          created_at?: string
          crew_id?: string | null
          currency?: string
          customer_email?: string | null
          id?: string
          immediate_start_at?: string | null
          paid_at?: string | null
          refunded_at?: string | null
          refunded_cents?: number
          source: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          terms_accepted_at?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_code_id?: string | null
          amount_cents?: number
          created_at?: string
          crew_id?: string | null
          currency?: string
          customer_email?: string | null
          id?: string
          immediate_start_at?: string | null
          paid_at?: string | null
          refunded_at?: string | null
          refunded_cents?: number
          source?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          terms_accepted_at?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_purchases_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_purchases_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          avatar_path: string | null
          car_number: string | null
          city: string | null
          contact_email: string | null
          cover_focus_x: number
          cover_focus_y: number
          cover_path: string | null
          created_at: string
          current_rank: number | null
          facebook_url: string | null
          followers_count: number
          fundraiser_url: string | null
          id: string
          instagram_url: string | null
          is_demo: boolean
          is_public: boolean
          last_fix_at: string | null
          last_lat: number | null
          last_lon: number | null
          last_speed_kmh: number | null
          name: string
          school: string | null
          slug: string
          start_lat: number | null
          start_lon: number | null
          start_region: string | null
          story: string | null
          supplies_count: number | null
          tagline: string | null
          total_distance_m: number
          tracking_enabled: boolean
          tracking_stopped_at: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          avatar_path?: string | null
          car_number?: string | null
          city?: string | null
          contact_email?: string | null
          cover_focus_x?: number
          cover_focus_y?: number
          cover_path?: string | null
          created_at?: string
          current_rank?: number | null
          facebook_url?: string | null
          followers_count?: number
          fundraiser_url?: string | null
          id?: string
          instagram_url?: string | null
          is_demo?: boolean
          is_public?: boolean
          last_fix_at?: string | null
          last_lat?: number | null
          last_lon?: number | null
          last_speed_kmh?: number | null
          name: string
          school?: string | null
          slug: string
          start_lat?: number | null
          start_lon?: number | null
          start_region?: string | null
          story?: string | null
          supplies_count?: number | null
          tagline?: string | null
          total_distance_m?: number
          tracking_enabled?: boolean
          tracking_stopped_at?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          avatar_path?: string | null
          car_number?: string | null
          city?: string | null
          contact_email?: string | null
          cover_focus_x?: number
          cover_focus_y?: number
          cover_path?: string | null
          created_at?: string
          current_rank?: number | null
          facebook_url?: string | null
          followers_count?: number
          fundraiser_url?: string | null
          id?: string
          instagram_url?: string | null
          is_demo?: boolean
          is_public?: boolean
          last_fix_at?: string | null
          last_lat?: number | null
          last_lon?: number | null
          last_speed_kmh?: number | null
          name?: string
          school?: string | null
          slug?: string
          start_lat?: number | null
          start_lon?: number | null
          start_region?: string | null
          story?: string | null
          supplies_count?: number | null
          tagline?: string | null
          total_distance_m?: number
          tracking_enabled?: boolean
          tracking_stopped_at?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          crew_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crew_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          crew_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_test_fixes: {
        Row: {
          accuracy: number | null
          battery: number | null
          crew_id: string
          lat: number
          lon: number
          received_at: string
          recorded_at: string
          speed_kmh: number | null
        }
        Insert: {
          accuracy?: number | null
          battery?: number | null
          crew_id: string
          lat: number
          lon: number
          received_at?: string
          recorded_at: string
          speed_kmh?: number | null
        }
        Update: {
          accuracy?: number | null
          battery?: number | null
          crew_id?: string
          lat?: number
          lon?: number
          received_at?: string
          recorded_at?: string
          speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_test_fixes_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: true
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          created_by: string | null
          crew_id: string
          description: string | null
          height: number | null
          id: string
          kind: string
          lat: number | null
          location: string | null
          lon: number | null
          storage_path: string
          taken_at: string | null
          taken_label: string | null
          title: string
          width: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crew_id: string
          description?: string | null
          height?: number | null
          id?: string
          kind: string
          lat?: number | null
          location?: string | null
          lon?: number | null
          storage_path: string
          taken_at?: string | null
          taken_label?: string | null
          title: string
          width?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crew_id?: string
          description?: string | null
          height?: number | null
          id?: string
          kind?: string
          lat?: number | null
          location?: string | null
          lon?: number | null
          storage_path?: string
          taken_at?: string | null
          taken_label?: string | null
          title?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          accuracy: number | null
          altitude: number | null
          battery: number | null
          course: number | null
          created_at: string
          crew_id: string
          distance_from_prev_m: number
          id: number
          lat: number
          lon: number
          recorded_at: string
          source: string
          speed_kmh: number | null
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          battery?: number | null
          course?: number | null
          created_at?: string
          crew_id: string
          distance_from_prev_m?: number
          id?: never
          lat: number
          lon: number
          recorded_at: string
          source: string
          speed_kmh?: number | null
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          battery?: number | null
          course?: number | null
          created_at?: string
          crew_id?: string
          distance_from_prev_m?: number
          id?: never
          lat?: number
          lon?: number
          recorded_at?: string
          source?: string
          speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          city: string | null
          created_at: string
          crew_id: string
          id: string
          lat: number | null
          logo_path: string | null
          lon: number | null
          name: string
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          crew_id: string
          id?: string
          lat?: number | null
          logo_path?: string | null
          lon?: number | null
          name: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          crew_id?: string
          id?: string
          lat?: number | null
          logo_path?: string | null
          lon?: number | null
          name?: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      waypoints: {
        Row: {
          country: string | null
          created_at: string
          day_end: number | null
          day_start: number | null
          description: string | null
          id: string
          kind: string
          lat: number
          lon: number
          name: string
          parent_id: string | null
          planned_at: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          day_end?: number | null
          day_start?: number | null
          description?: string | null
          id?: string
          kind: string
          lat: number
          lon: number
          name: string
          parent_id?: string | null
          planned_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          day_end?: number | null
          day_start?: number | null
          description?: string | null
          id?: string
          kind?: string
          lat?: number
          lon?: number
          name?: string
          parent_id?: string | null
          planned_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waypoints_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "waypoints"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_fair_play: { Args: { p_crew: string }; Returns: undefined }
      add_crew_member: {
        Args: { p_crew: string; p_email: string }
        Returns: undefined
      }
      admin_create_access_code: {
        Args: { p_expires_at?: string; p_max_uses?: number; p_note?: string }
        Returns: string
      }
      admin_grant_crew_access: { Args: { p_email: string }; Returns: undefined }
      admin_list_access_codes: {
        Args: never
        Returns: {
          code: string
          created_at: string
          expires_at: string
          id: string
          max_uses: number
          note: string
          revoked_at: string
          used_by: string[]
          uses: number
        }[]
      }
      admin_list_crews: {
        Args: never
        Returns: {
          car_number: string
          followers_count: number
          has_device_key: boolean
          id: string
          is_public: boolean
          last_fix_at: string
          name: string
          slug: string
          traccar_device_id: string
        }[]
      }
      admin_list_purchases: {
        Args: never
        Returns: {
          access_code: string
          amount_cents: number
          created_at: string
          crew_name: string
          crew_slug: string
          customer_email: string
          id: string
          paid_at: string
          refunded_cents: number
          source: string
          status: string
        }[]
      }
      admin_list_users: {
        Args: { p_search?: string }
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          last_sign_in_at: string
          role: string
        }[]
      }
      admin_overview: { Args: never; Returns: Json }
      admin_revoke_access_code: { Args: { p_id: string }; Returns: undefined }
      admin_set_role: {
        Args: { p_role: string; p_user: string }
        Returns: undefined
      }
      admin_set_traccar_device: {
        Args: { p_crew: string; p_device: string }
        Returns: undefined
      }
      create_crew: {
        Args: { p_car_number?: string; p_name: string; p_tagline?: string }
        Returns: {
          avatar_path: string | null
          car_number: string | null
          city: string | null
          contact_email: string | null
          cover_focus_x: number
          cover_focus_y: number
          cover_path: string | null
          created_at: string
          current_rank: number | null
          facebook_url: string | null
          followers_count: number
          fundraiser_url: string | null
          id: string
          instagram_url: string | null
          is_demo: boolean
          is_public: boolean
          last_fix_at: string | null
          last_lat: number | null
          last_lon: number | null
          last_speed_kmh: number | null
          name: string
          school: string | null
          slug: string
          start_lat: number | null
          start_lon: number | null
          start_region: string | null
          story: string | null
          supplies_count: number | null
          tagline: string | null
          total_distance_m: number
          tracking_enabled: boolean
          tracking_stopped_at: string | null
          updated_at: string
          website_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "crews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crew_price: {
        Args: never
        Returns: {
          amount_cents: number
          is_launch_price: boolean
          launch_price_until: string
          regular_cents: number
        }[]
      }
      delete_my_account: { Args: never; Returns: undefined }
      get_crew_members: {
        Args: { p_crew: string }
        Returns: {
          display_name: string
          role: string
          user_id: string
        }[]
      }
      get_crew_stats: { Args: { p_crew: string }; Returns: Json }
      get_crew_tracking: {
        Args: { p_crew: string }
        Returns: {
          fair_play_accepted_at: string
          fair_play_accepted_by_name: string
          has_device_key: boolean
          traccar_device_id: string
        }[]
      }
      get_track: { Args: { p_crew: string; p_since?: string }; Returns: Json }
      purchase_attach_session: {
        Args: { p_purchase: string; p_session: string }
        Returns: undefined
      }
      purchase_expired: { Args: { p_session: string }; Returns: undefined }
      purchase_paid: {
        Args: {
          p_amount: number
          p_email: string
          p_payment_intent: string
          p_session: string
        }
        Returns: string
      }
      purchase_refunded: {
        Args: { p_payment_intent: string; p_refunded_cents: number }
        Returns: string
      }
      purchase_start: {
        Args: { p_email: string; p_user: string }
        Returns: {
          amount_cents: number
          purchase_id: string
        }[]
      }
      redeem_access_code: { Args: { p_code: string }; Returns: string }
      regenerate_device_key: { Args: { p_crew: string }; Returns: string }
      remove_crew_member: {
        Args: { p_crew: string; p_user: string }
        Returns: undefined
      }
      reset_track: { Args: { p_crew: string }; Returns: undefined }
      revoke_device_key: { Args: { p_crew: string }; Returns: undefined }
      search_crews: {
        Args: {
          p_limit?: number
          p_live_only?: boolean
          p_offset?: number
          p_query?: string
        }
        Returns: Json
      }
      set_crew_member_role: {
        Args: { p_crew: string; p_role: string; p_user: string }
        Returns: undefined
      }
      set_tracking: {
        Args: { p_crew: string; p_enabled: boolean }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

