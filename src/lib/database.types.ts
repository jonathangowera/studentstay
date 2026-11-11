export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      allocation_candidates: {
        Row: {
          bed_id: string | null
          excluded: boolean
          exclusion_reason: string | null
          explanation: string | null
          id: string
          rank: number | null
          room_id: string
          run_id: string
          score_availability: number | null
          score_budget: number | null
          score_distance: number | null
          score_facilities: number | null
          score_room_type: number | null
          score_total: number | null
        }
        Insert: {
          bed_id?: string | null
          excluded?: boolean
          exclusion_reason?: string | null
          explanation?: string | null
          id?: string
          rank?: number | null
          room_id: string
          run_id: string
          score_availability?: number | null
          score_budget?: number | null
          score_distance?: number | null
          score_facilities?: number | null
          score_room_type?: number | null
          score_total?: number | null
        }
        Update: {
          bed_id?: string | null
          excluded?: boolean
          exclusion_reason?: string | null
          explanation?: string | null
          id?: string
          rank?: number | null
          room_id?: string
          run_id?: string
          score_availability?: number | null
          score_budget?: number | null
          score_distance?: number | null
          score_facilities?: number | null
          score_room_type?: number | null
          score_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "allocation_candidates_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_candidates_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_candidates_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "allocation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      allocation_rules: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          hard_constraints: Json
          id: string
          institution_id: string
          name: string
          version: number
          w_availability: number
          w_budget: number
          w_distance: number
          w_facilities: number
          w_room_type: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          hard_constraints?: Json
          id?: string
          institution_id: string
          name: string
          version: number
          w_availability: number
          w_budget: number
          w_distance: number
          w_facilities: number
          w_room_type: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          hard_constraints?: Json
          id?: string
          institution_id?: string
          name?: string
          version?: number
          w_availability?: number
          w_budget?: number
          w_distance?: number
          w_facilities?: number
          w_room_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "allocation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_rules_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      allocation_runs: {
        Row: {
          application_id: string
          approved_bed_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: Database["public"]["Enums"]["allocation_decision"]
          decision_note: string | null
          explanation: string | null
          id: string
          rule_id: string
          run_by: string | null
        }
        Insert: {
          application_id: string
          approved_bed_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["allocation_decision"]
          decision_note?: string | null
          explanation?: string | null
          id?: string
          rule_id: string
          run_by?: string | null
        }
        Update: {
          application_id?: string
          approved_bed_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["allocation_decision"]
          decision_note?: string | null
          explanation?: string | null
          id?: string
          rule_id?: string
          run_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allocation_runs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_runs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "private_application_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_runs_approved_bed_id_fkey"
            columns: ["approved_bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_runs_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "allocation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_runs_run_by_fkey"
            columns: ["run_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["audience_kind"]
          audience_institution_id: string | null
          audience_listing_id: string | null
          audience_role: Database["public"]["Enums"]["user_role"] | null
          audience_user_ids: string[] | null
          author_id: string
          body: string
          created_at: string
          id: string
          recipient_count: number | null
          sent_at: string | null
          title: string
        }
        Insert: {
          audience: Database["public"]["Enums"]["audience_kind"]
          audience_institution_id?: string | null
          audience_listing_id?: string | null
          audience_role?: Database["public"]["Enums"]["user_role"] | null
          audience_user_ids?: string[] | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          recipient_count?: number | null
          sent_at?: string | null
          title: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["audience_kind"]
          audience_institution_id?: string | null
          audience_listing_id?: string | null
          audience_role?: Database["public"]["Enums"]["user_role"] | null
          audience_user_ids?: string[] | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          recipient_count?: number | null
          sent_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_audience_institution_id_fkey"
            columns: ["audience_institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_audience_listing_id_fkey"
            columns: ["audience_listing_id"]
            isOneToOne: false
            referencedRelation: "listing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_audience_listing_id_fkey"
            columns: ["audience_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["application_status"] | null
          id: number
          note: string | null
          to_status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: never
          note?: string | null
          to_status: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: never
          note?: string | null
          to_status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "private_application_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          budget_zmw: number | null
          created_at: string
          gender_needed: Database["public"]["Enums"]["gender_policy"] | null
          id: string
          institution_id: string | null
          intake: string | null
          listing_id: string | null
          preferred_facilities: string[]
          reference: string
          requested_room_type: Database["public"]["Enums"]["room_type"] | null
          route: Database["public"]["Enums"]["application_route"]
          status: Database["public"]["Enums"]["application_status"]
          status_reason: string | null
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          budget_zmw?: number | null
          created_at?: string
          gender_needed?: Database["public"]["Enums"]["gender_policy"] | null
          id?: string
          institution_id?: string | null
          intake?: string | null
          listing_id?: string | null
          preferred_facilities?: string[]
          reference?: string
          requested_room_type?: Database["public"]["Enums"]["room_type"] | null
          route: Database["public"]["Enums"]["application_route"]
          status?: Database["public"]["Enums"]["application_status"]
          status_reason?: string | null
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          budget_zmw?: number | null
          created_at?: string
          gender_needed?: Database["public"]["Enums"]["gender_policy"] | null
          id?: string
          institution_id?: string | null
          intake?: string | null
          listing_id?: string | null
          preferred_facilities?: string[]
          reference?: string
          requested_room_type?: Database["public"]["Enums"]["room_type"] | null
          route?: Database["public"]["Enums"]["application_route"]
          status?: Database["public"]["Enums"]["application_status"]
          status_reason?: string | null
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          detail: Json
          id: number
          institution_id: string | null
          outcome: string
          record_id: string | null
          record_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          detail?: Json
          id?: never
          institution_id?: string | null
          outcome?: string
          record_id?: string | null
          record_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          detail?: Json
          id?: never
          institution_id?: string | null
          outcome?: string
          record_id?: string | null
          record_type?: string | null
        }
        Relationships: []
      }
      beds: {
        Row: {
          created_at: string
          held_for_application_id: string | null
          hold_expires_at: string | null
          id: string
          label: string
          room_id: string
          state: Database["public"]["Enums"]["bed_state"]
          state_changed_at: string
          state_changed_by: string | null
          state_note: string | null
        }
        Insert: {
          created_at?: string
          held_for_application_id?: string | null
          hold_expires_at?: string | null
          id?: string
          label: string
          room_id: string
          state?: Database["public"]["Enums"]["bed_state"]
          state_changed_at?: string
          state_changed_by?: string | null
          state_note?: string | null
        }
        Update: {
          created_at?: string
          held_for_application_id?: string | null
          hold_expires_at?: string | null
          id?: string
          label?: string
          room_id?: string
          state?: Database["public"]["Enums"]["bed_state"]
          state_changed_at?: string
          state_changed_by?: string | null
          state_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beds_held_for_fk"
            columns: ["held_for_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_held_for_fk"
            columns: ["held_for_application_id"]
            isOneToOne: false
            referencedRelation: "private_application_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_state_changed_by_fkey"
            columns: ["state_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          application_id: string
          bed_id: string
          created_at: string
          deposit_due_at: string | null
          end_date: string
          id: string
          start_date: string
          state: Database["public"]["Enums"]["booking_state"]
          student_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          bed_id: string
          created_at?: string
          deposit_due_at?: string | null
          end_date: string
          id?: string
          start_date: string
          state?: Database["public"]["Enums"]["booking_state"]
          student_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          bed_id?: string
          created_at?: string
          deposit_due_at?: string | null
          end_date?: string
          id?: string
          start_date?: string
          state?: Database["public"]["Enums"]["booking_state"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "private_application_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          application_id: string | null
          auto_checked_at: string | null
          auto_result: Database["public"]["Enums"]["check_result"] | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          listing_id: string | null
          mime_type: string
          original_name: string | null
          retain_until: string
          review_decision: Database["public"]["Enums"]["review_decision"]
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Insert: {
          application_id?: string | null
          auto_checked_at?: string | null
          auto_result?: Database["public"]["Enums"]["check_result"] | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          listing_id?: string | null
          mime_type: string
          original_name?: string | null
          retain_until?: string
          review_decision?: Database["public"]["Enums"]["review_decision"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Update: {
          application_id?: string | null
          auto_checked_at?: string | null
          auto_result?: Database["public"]["Enums"]["check_result"] | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          listing_id?: string | null
          mime_type?: string
          original_name?: string | null
          retain_until?: string
          review_decision?: Database["public"]["Enums"]["review_decision"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          size_bytes?: number
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "private_application_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      listing_distances: {
        Row: {
          distance_km: number
          institution_id: string
          listing_id: string
          partnered: boolean
        }
        Insert: {
          distance_km: number
          institution_id: string
          listing_id: string
          partnered?: boolean
        }
        Update: {
          distance_km?: number
          institution_id?: string
          listing_id?: string
          partnered?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "listing_distances_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_distances_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_distances_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          area: string
          created_at: string
          deposit_note: string | null
          description: string | null
          facilities: string[]
          gender: Database["public"]["Enums"]["gender_policy"]
          gender_note: string | null
          house_rules: string | null
          id: string
          institution_id: string | null
          last_updated_at: string
          lat: number | null
          lng: number | null
          min_stay_note: string | null
          moderation: Database["public"]["Enums"]["moderation_state"]
          moderation_note: string | null
          name: string
          partner_id: string
          rent_unit: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string
          verification: Database["public"]["Enums"]["review_decision"]
        }
        Insert: {
          address?: string | null
          area: string
          created_at?: string
          deposit_note?: string | null
          description?: string | null
          facilities?: string[]
          gender?: Database["public"]["Enums"]["gender_policy"]
          gender_note?: string | null
          house_rules?: string | null
          id?: string
          institution_id?: string | null
          last_updated_at?: string
          lat?: number | null
          lng?: number | null
          min_stay_note?: string | null
          moderation?: Database["public"]["Enums"]["moderation_state"]
          moderation_note?: string | null
          name: string
          partner_id: string
          rent_unit?: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["review_decision"]
        }
        Update: {
          address?: string | null
          area?: string
          created_at?: string
          deposit_note?: string | null
          description?: string | null
          facilities?: string[]
          gender?: Database["public"]["Enums"]["gender_policy"]
          gender_note?: string | null
          house_rules?: string | null
          id?: string
          institution_id?: string | null
          last_updated_at?: string
          lat?: number | null
          lng?: number | null
          min_stay_note?: string | null
          moderation?: Database["public"]["Enums"]["moderation_state"]
          moderation_note?: string | null
          name?: string
          partner_id?: string
          rent_unit?: string
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["review_decision"]
        }
        Relationships: [
          {
            foreignKeyName: "listings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          access_notes: string | null
          assigned_to: string | null
          bed_id: string | null
          blocks_bed: boolean
          booking_id: string | null
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          listing_id: string
          location_text: string
          photo_path: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          reference: string
          reporter_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          status_note: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          assigned_to?: string | null
          bed_id?: string | null
          blocks_bed?: boolean
          booking_id?: string | null
          category: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          listing_id: string
          location_text: string
          photo_path?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reference?: string
          reporter_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          status_note?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          assigned_to?: string | null
          bed_id?: string | null
          blocks_bed?: boolean
          booking_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          listing_id?: string
          location_text?: string
          photo_path?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reference?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          status_note?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          announcement_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          announcement_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          announcement_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          business_name: string
          contact_phone: string | null
          created_at: string
          id: string
          owner_id: string | null
          updated_at: string
          verification: Database["public"]["Enums"]["review_decision"]
        }
        Insert: {
          business_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["review_decision"]
        }
        Update: {
          business_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["review_decision"]
        }
        Relationships: [
          {
            foreignKeyName: "partners_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_zmw: number
          application_id: string
          booking_id: string | null
          created_at: string
          id: string
          is_simulated: boolean
          method: string
          original_payment_id: string | null
          payer_id: string
          purpose: Database["public"]["Enums"]["payment_purpose"]
          reference: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_zmw: number
          application_id: string
          booking_id?: string | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          method?: string
          original_payment_id?: string | null
          payer_id: string
          purpose: Database["public"]["Enums"]["payment_purpose"]
          reference?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_zmw?: number
          application_id?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          method?: string
          original_payment_id?: string | null
          payer_id?: string
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          reference?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "private_application_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_original_payment_id_fkey"
            columns: ["original_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          budget_zmw: number | null
          created_at: string
          emergency_contact: string | null
          full_name: string
          id: string
          institution_id: string | null
          notify_sms: boolean
          owner_can_see_profile: boolean
          phone: string | null
          preferred_facilities: string[]
          preferred_room_type: Database["public"]["Enums"]["room_type"] | null
          programme: string | null
          role: Database["public"]["Enums"]["user_role"]
          student_number: string | null
          student_number_matched: boolean
          study_year: number | null
          updated_at: string
        }
        Insert: {
          budget_zmw?: number | null
          created_at?: string
          emergency_contact?: string | null
          full_name?: string
          id: string
          institution_id?: string | null
          notify_sms?: boolean
          owner_can_see_profile?: boolean
          phone?: string | null
          preferred_facilities?: string[]
          preferred_room_type?: Database["public"]["Enums"]["room_type"] | null
          programme?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          student_number?: string | null
          student_number_matched?: boolean
          study_year?: number | null
          updated_at?: string
        }
        Update: {
          budget_zmw?: number | null
          created_at?: string
          emergency_contact?: string | null
          full_name?: string
          id?: string
          institution_id?: string | null
          notify_sms?: boolean
          owner_can_see_profile?: boolean
          phone?: string | null
          preferred_facilities?: string[]
          preferred_room_type?: Database["public"]["Enums"]["room_type"] | null
          programme?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          student_number?: string | null
          student_number_matched?: boolean
          study_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          floor: number | null
          gender: Database["public"]["Enums"]["gender_policy"] | null
          id: string
          listing_id: string
          price_zmw: number
          room_number: string
          room_type: Database["public"]["Enums"]["room_type"]
          wing: string | null
        }
        Insert: {
          capacity: number
          created_at?: string
          floor?: number | null
          gender?: Database["public"]["Enums"]["gender_policy"] | null
          id?: string
          listing_id: string
          price_zmw: number
          room_number: string
          room_type: Database["public"]["Enums"]["room_type"]
          wing?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          floor?: number | null
          gender?: Database["public"]["Enums"]["gender_policy"] | null
          id?: string
          listing_id?: string
          price_zmw?: number
          room_number?: string
          room_type?: Database["public"]["Enums"]["room_type"]
          wing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlist: {
        Row: {
          created_at: string
          listing_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlist_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      state_transitions: {
        Row: {
          from_state: string
          machine: string
          to_state: string
        }
        Insert: {
          from_state: string
          machine: string
          to_state: string
        }
        Update: {
          from_state?: string
          machine?: string
          to_state?: string
        }
        Relationships: []
      }
      ticket_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["ticket_status"] | null
          id: number
          note: string | null
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: never
          note?: string | null
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: never
          note?: string | null
          ticket_id?: string
          to_status?: Database["public"]["Enums"]["ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      listing_cards: {
        Row: {
          area: string | null
          beds_available: number | null
          beds_total: number | null
          distances: Json | null
          facilities: string[] | null
          free_room_types: Database["public"]["Enums"]["room_type"][] | null
          gender: Database["public"]["Enums"]["gender_policy"] | null
          gender_note: string | null
          id: string | null
          is_stale: boolean | null
          last_updated_at: string | null
          managed_by: string | null
          name: string | null
          price_from: number | null
          price_to: number | null
          rent_unit: string | null
          room_types: Database["public"]["Enums"]["room_type"][] | null
          type: Database["public"]["Enums"]["listing_type"] | null
          verification: Database["public"]["Enums"]["review_decision"] | null
        }
        Relationships: []
      }
      private_application_inbox: {
        Row: {
          applicant_institution: string | null
          applicant_name: string | null
          budget_zmw: number | null
          document_count: number | null
          id: string | null
          intake: string | null
          listing_id: string | null
          reference: string | null
          requested_room_type: Database["public"]["Enums"]["room_type"] | null
          status: Database["public"]["Enums"]["application_status"] | null
          submitted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _commit_booking: {
        Args: { p_app: string; p_bed: string; p_end: string; p_start: string }
        Returns: string
      }
      _notify: {
        Args: {
          p_body?: string
          p_kind: string
          p_link?: string
          p_title: string
          p_user: string
        }
        Returns: undefined
      }
      _release_beds: {
        Args: { p_app: string; p_note: string }
        Returns: undefined
      }
      admin_of_hostel: { Args: { p: string }; Returns: boolean }
      admin_of_listing: { Args: { p: string }; Returns: boolean }
      app_institution: { Args: never; Returns: string }
      app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      assign_ticket: {
        Args: { p_note?: string; p_technician: string; p_ticket: string }
        Returns: undefined
      }
      can_manage_listing: { Args: { p: string }; Returns: boolean }
      can_see_listing: { Args: { p: string }; Returns: boolean }
      confirm_listing_availability: {
        Args: { p_listing: string }
        Returns: undefined
      }
      confirm_student_number: {
        Args: { p_student: string }
        Returns: undefined
      }
      decide_allocation: {
        Args: {
          p_bed?: string
          p_decision: string
          p_end?: string
          p_note?: string
          p_run: string
          p_start?: string
        }
        Returns: undefined
      }
      decide_private_application: {
        Args: {
          p_app: string
          p_bed?: string
          p_decision: string
          p_note?: string
        }
        Returns: undefined
      }
      email_verified: { Args: never; Returns: boolean }
      escalate_overdue_tickets: { Args: never; Returns: number }
      expire_holds: { Args: never; Returns: number }
      is_sysadmin: { Args: never; Returns: boolean }
      listing_of_bed: { Args: { p: string }; Returns: string }
      listing_of_booking: { Args: { p: string }; Returns: string }
      listing_of_room: { Args: { p: string }; Returns: string }
      log_audit: {
        Args: {
          p_action: string
          p_detail?: Json
          p_id: string
          p_outcome?: string
          p_type: string
        }
        Returns: undefined
      }
      moderate_listing: {
        Args: {
          p_listing: string
          p_note?: string
          p_state: Database["public"]["Enums"]["moderation_state"]
        }
        Returns: undefined
      }
      owner_of_application: { Args: { p: string }; Returns: boolean }
      owns_listing: { Args: { p: string }; Returns: boolean }
      publish_announcement: { Args: { p_id: string }; Returns: number }
      record_simulated_payment: {
        Args: {
          p_amount: number
          p_app: string
          p_method?: string
          p_purpose: Database["public"]["Enums"]["payment_purpose"]
        }
        Returns: {
          amount_zmw: number
          application_id: string
          booking_id: string | null
          created_at: string
          id: string
          is_simulated: boolean
          method: string
          original_payment_id: string | null
          payer_id: string
          purpose: Database["public"]["Enums"]["payment_purpose"]
          reference: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_ticket_status: {
        Args: {
          p_new: Database["public"]["Enums"]["ticket_status"]
          p_note?: string
          p_ticket: string
        }
        Returns: undefined
      }
      submit_application: {
        Args: { p_app: string }
        Returns: Database["public"]["Enums"]["application_status"]
      }
      submit_listing_for_moderation: {
        Args: { p_listing: string }
        Returns: undefined
      }
      withdraw_application: {
        Args: { p_app: string; p_reason?: string }
        Returns: undefined
      }
    }
    Enums: {
      allocation_decision:
        | "pending"
        | "approved"
        | "modified"
        | "rejected"
        | "rerun"
      application_route: "university_allocation" | "private"
      application_status:
        | "draft"
        | "submitted"
        | "profile_incomplete"
        | "under_review"
        | "recommended"
        | "pending_approval"
        | "approved"
        | "accepted"
        | "declined"
        | "no_eligible_room"
        | "withdrawn"
        | "expired"
      audience_kind: "all" | "institution" | "listing" | "role" | "users"
      bed_state:
        | "available"
        | "held"
        | "pending_approval"
        | "reserved"
        | "occupied"
        | "blocked_for_maintenance"
      booking_state:
        | "reserved"
        | "occupied"
        | "cancelled"
        | "expired"
        | "released"
      check_result: "clear" | "unclear" | "possible_duplicate"
      document_kind: "national_id" | "proof_of_enrolment" | "ownership_proof"
      gender_policy: "female_only" | "male_only" | "mixed"
      listing_type:
        | "university_hostel"
        | "recognised_boarding_house"
        | "private_rental"
      moderation_state:
        | "draft"
        | "awaiting_moderation"
        | "published"
        | "requires_review"
        | "suspended"
      payment_purpose: "application_fee" | "deposit" | "rent"
      payment_status: "pending" | "successful" | "failed" | "refunded"
      review_decision:
        | "pending"
        | "verified"
        | "resubmission_required"
        | "requires_review"
      room_type: "single" | "double" | "triple" | "quad"
      ticket_priority: "low" | "medium" | "high"
      ticket_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "reopened"
        | "escalated"
        | "cancelled"
      user_role:
        | "student"
        | "owner"
        | "university_admin"
        | "technician"
        | "system_admin"
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
    Enums: {
      allocation_decision: [
        "pending",
        "approved",
        "modified",
        "rejected",
        "rerun",
      ],
      application_route: ["university_allocation", "private"],
      application_status: [
        "draft",
        "submitted",
        "profile_incomplete",
        "under_review",
        "recommended",
        "pending_approval",
        "approved",
        "accepted",
        "declined",
        "no_eligible_room",
        "withdrawn",
        "expired",
      ],
      audience_kind: ["all", "institution", "listing", "role", "users"],
      bed_state: [
        "available",
        "held",
        "pending_approval",
        "reserved",
        "occupied",
        "blocked_for_maintenance",
      ],
      booking_state: [
        "reserved",
        "occupied",
        "cancelled",
        "expired",
        "released",
      ],
      check_result: ["clear", "unclear", "possible_duplicate"],
      document_kind: ["national_id", "proof_of_enrolment", "ownership_proof"],
      gender_policy: ["female_only", "male_only", "mixed"],
      listing_type: [
        "university_hostel",
        "recognised_boarding_house",
        "private_rental",
      ],
      moderation_state: [
        "draft",
        "awaiting_moderation",
        "published",
        "requires_review",
        "suspended",
      ],
      payment_purpose: ["application_fee", "deposit", "rent"],
      payment_status: ["pending", "successful", "failed", "refunded"],
      review_decision: [
        "pending",
        "verified",
        "resubmission_required",
        "requires_review",
      ],
      room_type: ["single", "double", "triple", "quad"],
      ticket_priority: ["low", "medium", "high"],
      ticket_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "reopened",
        "escalated",
        "cancelled",
      ],
      user_role: [
        "student",
        "owner",
        "university_admin",
        "technician",
        "system_admin",
      ],
    },
  },
} as const
