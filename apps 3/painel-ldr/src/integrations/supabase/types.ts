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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_bootstrap: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: boolean
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: boolean
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: boolean
        }
        Relationships: []
      }
      appointment_calendar_sync: {
        Row: {
          appointment_id: string
          attempts: number
          calendar_id: string
          created_at: string
          google_event_id: string | null
          last_attempt_at: string | null
          last_error_code: string | null
          lease_expires_at: string | null
          lease_token: string | null
          meet_url: string | null
          sync_status: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          attempts?: number
          calendar_id?: string
          created_at?: string
          google_event_id?: string | null
          last_attempt_at?: string | null
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          meet_url?: string | null
          sync_status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          attempts?: number
          calendar_id?: string
          created_at?: string
          google_event_id?: string | null
          last_attempt_at?: string | null
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          meet_url?: string | null
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_calendar_sync_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          actor_label: string | null
          appointment_id: string
          client_visible: boolean
          comment: string | null
          created_at: string
          event: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: string
          actor_label?: string | null
          appointment_id: string
          client_visible?: boolean
          comment?: string | null
          created_at?: string
          event: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          actor_label?: string | null
          appointment_id?: string
          client_visible?: boolean
          comment?: string | null
          created_at?: string
          event?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          catalog_key: string | null
          client_notes: string | null
          client_visible: boolean
          consumes_credit: boolean
          created_at: string
          created_by: string | null
          customer_id: string | null
          duration_minutes: number
          ends_at: string | null
          id: string
          internal_notes: string | null
          meeting_url: string | null
          mentorship_id: string | null
          order_id: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          title: string
          updated_at: string
        }
        Insert: {
          catalog_key?: string | null
          client_notes?: string | null
          client_visible?: boolean
          consumes_credit?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          internal_notes?: string | null
          meeting_url?: string | null
          mentorship_id?: string | null
          order_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          catalog_key?: string | null
          client_notes?: string | null
          client_visible?: boolean
          consumes_credit?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          internal_notes?: string | null
          meeting_url?: string | null
          mentorship_id?: string | null
          order_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_catalog_key_fkey"
            columns: ["catalog_key"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["catalog_key"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "mentorships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      business_projects: {
        Row: {
          business_name: string | null
          channels: string | null
          costs: string | null
          created_at: string
          goals_indicators: string | null
          id: string
          idea_pitch: string | null
          participant_id: string
          partners_resources: string | null
          plan_30_60_90: string | null
          pricing: string | null
          problem: string | null
          product_service: string | null
          revenues: string | null
          risks_responses: string | null
          sales: string | null
          solution: string | null
          target_audience: string | null
          updated_at: string
          value_proposition: string | null
        }
        Insert: {
          business_name?: string | null
          channels?: string | null
          costs?: string | null
          created_at?: string
          goals_indicators?: string | null
          id?: string
          idea_pitch?: string | null
          participant_id: string
          partners_resources?: string | null
          plan_30_60_90?: string | null
          pricing?: string | null
          problem?: string | null
          product_service?: string | null
          revenues?: string | null
          risks_responses?: string | null
          sales?: string | null
          solution?: string | null
          target_audience?: string | null
          updated_at?: string
          value_proposition?: string | null
        }
        Update: {
          business_name?: string | null
          channels?: string | null
          costs?: string | null
          created_at?: string
          goals_indicators?: string | null
          id?: string
          idea_pitch?: string | null
          participant_id?: string
          partners_resources?: string | null
          plan_30_60_90?: string | null
          pricing?: string | null
          problem?: string | null
          product_service?: string | null
          revenues?: string | null
          risks_responses?: string | null
          sales?: string | null
          solution?: string | null
          target_audience?: string | null
          updated_at?: string
          value_proposition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_projects_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_access_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          record_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
        }
        Relationships: []
      }
      clinical_attachments: {
        Row: {
          algo: string
          archived: boolean
          archived_at: string | null
          auth_tag: string | null
          bucket: string
          created_at: string
          file_name: string
          id: string
          iv: string | null
          mime_type: string | null
          record_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          algo?: string
          archived?: boolean
          archived_at?: string | null
          auth_tag?: string | null
          bucket?: string
          created_at?: string
          file_name: string
          id?: string
          iv?: string | null
          mime_type?: string | null
          record_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          algo?: string
          archived?: boolean
          archived_at?: string | null
          auth_tag?: string | null
          bucket?: string
          created_at?: string
          file_name?: string
          id?: string
          iv?: string | null
          mime_type?: string | null
          record_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_attachments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "clinical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_record_versions: {
        Row: {
          algo: string
          auth_tag: string
          author_id: string | null
          ciphertext: string
          created_at: string
          id: string
          iv: string
          record_id: string
          version: number
        }
        Insert: {
          algo?: string
          auth_tag: string
          author_id?: string | null
          ciphertext: string
          created_at?: string
          id?: string
          iv: string
          record_id: string
          version: number
        }
        Update: {
          algo?: string
          auth_tag?: string
          author_id?: string | null
          ciphertext?: string
          created_at?: string
          id?: string
          iv?: string
          record_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_record_versions_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "clinical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_records: {
        Row: {
          appointment_id: string | null
          archived: boolean
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          order_id: string | null
          session_date: string | null
          session_number: number | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          archived?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          order_id?: string | null
          session_date?: string | null
          session_number?: number | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          archived?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          order_id?: string | null
          session_date?: string | null
          session_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          language: string | null
          notes: string | null
          phone: string | null
          portal_active: boolean
          portal_linked_at: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          language?: string | null
          notes?: string | null
          phone?: string | null
          portal_active?: boolean
          portal_linked_at?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          language?: string | null
          notes?: string | null
          phone?: string | null
          portal_active?: boolean
          portal_linked_at?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          approved_at: string | null
          assignee_id: string | null
          client_note: string | null
          client_visible: boolean
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivered_at: string | null
          delivery_url: string | null
          description: string | null
          due_date: string | null
          id: string
          needs_client_approval: boolean
          order_id: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          assignee_id?: string | null
          client_note?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_url?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          needs_client_approval?: boolean
          order_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          assignee_id?: string | null
          client_note?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_url?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          needs_client_approval?: boolean
          order_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          actor_label: string | null
          comment: string | null
          created_at: string
          delivery_id: string
          event: Database["public"]["Enums"]["delivery_event_type"]
          id: string
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: string
          actor_label?: string | null
          comment?: string | null
          created_at?: string
          delivery_id: string
          event: Database["public"]["Enums"]["delivery_event_type"]
          id?: string
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          actor_label?: string | null
          comment?: string | null
          created_at?: string
          delivery_id?: string
          event?: Database["public"]["Enums"]["delivery_event_type"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          created_at: string
          customer_id: string | null
          event_id: string
          event_type: string
          id: string
          occurred_at: string | null
          order_id: string | null
          source: string
          status: string
          summary: Json
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          event_id: string
          event_type: string
          id?: string
          occurred_at?: string | null
          order_id?: string | null
          source: string
          status?: string
          summary?: Json
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          event_id?: string
          event_type?: string
          id?: string
          occurred_at?: string | null
          order_id?: string | null
          source?: string
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_sessions: {
        Row: {
          appointment_id: string | null
          client_notes: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          internal_notes: string | null
          meeting_url: string | null
          mentorship_id: string
          scheduled_at: string | null
          session_number: number | null
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_notes?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          internal_notes?: string | null
          meeting_url?: string | null
          mentorship_id: string
          scheduled_at?: string | null
          session_number?: number | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_notes?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          internal_notes?: string | null
          meeting_url?: string | null
          mentorship_id?: string
          scheduled_at?: string | null
          session_number?: number | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_sessions_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "mentorships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorships: {
        Row: {
          client_summary: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          external_ref: string | null
          goal: string | null
          id: string
          intake_answers: string | null
          next_steps: string | null
          notes: string | null
          order_id: string | null
          participant_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          program_name: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["mentorship_status"]
          updated_at: string
        }
        Insert: {
          client_summary?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          external_ref?: string | null
          goal?: string | null
          id?: string
          intake_answers?: string | null
          next_steps?: string | null
          notes?: string | null
          order_id?: string | null
          participant_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          program_name?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["mentorship_status"]
          updated_at?: string
        }
        Update: {
          client_summary?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          external_ref?: string | null
          goal?: string | null
          id?: string
          intake_answers?: string | null
          next_steps?: string | null
          notes?: string | null
          order_id?: string | null
          participant_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          program_name?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["mentorship_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorships_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorships_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_history: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          created_at: string
          field: string
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          order_id: string
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          field: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          order_id: string
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          field?: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number | null
          assignee_id: string | null
          catalog_key: string | null
          category: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          external_ref: string | null
          id: string
          internal_notes: string | null
          is_request: boolean
          metadata: Json
          order_number: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          priority: Database["public"]["Enums"]["priority_level"]
          quantity: number
          service_type: Database["public"]["Enums"]["service_type"]
          source: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_link_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          assignee_id?: string | null
          catalog_key?: string | null
          category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          external_ref?: string | null
          id?: string
          internal_notes?: string | null
          is_request?: boolean
          metadata?: Json
          order_number: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          priority?: Database["public"]["Enums"]["priority_level"]
          quantity?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_link_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          assignee_id?: string | null
          catalog_key?: string | null
          category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          external_ref?: string | null
          id?: string
          internal_notes?: string | null
          is_request?: boolean
          metadata?: Json
          order_number?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          priority?: Database["public"]["Enums"]["priority_level"]
          quantity?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_link_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_catalog_key_fkey"
            columns: ["catalog_key"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["catalog_key"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          birth_date: string | null
          business_area: string | null
          business_stage: string | null
          city: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          goal: string | null
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          business_area?: string | null
          business_stage?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          goal?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          business_area?: string | null
          business_stage?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          goal?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pde_records: {
        Row: {
          competencies: string | null
          created_at: string
          evolution: string | null
          id: string
          participant_id: string
          recommendations: string | null
          strengths: string | null
          updated_at: string
        }
        Insert: {
          competencies?: string | null
          created_at?: string
          evolution?: string | null
          id?: string
          participant_id: string
          recommendations?: string | null
          strengths?: string | null
          updated_at?: string
        }
        Update: {
          competencies?: string | null
          created_at?: string
          evolution?: string | null
          id?: string
          participant_id?: string
          recommendations?: string | null
          strengths?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pde_records_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      s8_sessions: {
        Row: {
          appointment_id: string | null
          completed: boolean
          created_at: string
          duration_seconds: number
          id: string
          main_answers: string | null
          meeting_url: string | null
          participant_id: string
          professional_notes: string | null
          scale: number | null
          scheduled_at: string | null
          session_date: string | null
          session_number: number
          task: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          completed?: boolean
          created_at?: string
          duration_seconds?: number
          id?: string
          main_answers?: string | null
          meeting_url?: string | null
          participant_id: string
          professional_notes?: string | null
          scale?: number | null
          scheduled_at?: string | null
          session_date?: string | null
          session_number: number
          task?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          completed?: boolean
          created_at?: string
          duration_seconds?: number
          id?: string
          main_answers?: string | null
          meeting_url?: string | null
          participant_id?: string
          professional_notes?: string | null
          scale?: number | null
          scheduled_at?: string | null
          session_date?: string | null
          session_number?: number
          task?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "s8_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s8_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          active: boolean
          amount_cents: number
          billing_cadence: string
          billing_model: string
          catalog_key: string
          category: string
          created_at: string
          currency: string
          is_clinical: boolean
          name: string
          package_sessions: number
          payment_url: string | null
          repeat_payment_url: string | null
          sort_order: number
          stripe_payment_link_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          billing_cadence?: string
          billing_model?: string
          catalog_key: string
          category?: string
          created_at?: string
          currency?: string
          is_clinical?: boolean
          name: string
          package_sessions?: number
          payment_url?: string | null
          repeat_payment_url?: string | null
          sort_order?: number
          stripe_payment_link_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          billing_cadence?: string
          billing_model?: string
          catalog_key?: string
          category?: string
          created_at?: string
          currency?: string
          is_clinical?: boolean
          name?: string
          package_sessions?: number
          payment_url?: string | null
          repeat_payment_url?: string | null
          sort_order?: number
          stripe_payment_link_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_credits: {
        Row: {
          catalog_key: string | null
          created_at: string
          customer_id: string | null
          granted: number
          id: string
          order_id: string
          source: string
        }
        Insert: {
          catalog_key?: string | null
          created_at?: string
          customer_id?: string | null
          granted?: number
          id?: string
          order_id: string
          source?: string
        }
        Update: {
          catalog_key?: string | null
          created_at?: string
          customer_id?: string | null
          granted?: number
          id?: string
          order_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_credits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_event: {
        Args: { _action: string; _details: Json; _target: string }
        Returns: undefined
      }
      claim_calendar_sync: {
        Args: {
          _appointment_id: string
          _calendar_id: string
          _lease_seconds: number
        }
        Returns: {
          attempts: number
          claimed: boolean
          google_event_id: string
          lease_token: string
          meet_url: string
          sync_status: string
        }[]
      }
      client_request_appointment: {
        Args: {
          _actor: string
          _actor_label: string
          _customer_id: string
          _duration: number
          _note: string
          _order_id: string
          _starts_at: string
        }
        Returns: Json
      }
      client_reschedule_appointment: {
        Args: {
          _actor: string
          _actor_label: string
          _appointment_id: string
          _customer_id: string
          _note: string
          _starts_at: string
        }
        Returns: Json
      }
      confirm_appointment_tx: {
        Args: {
          _appointment_id: string
          _client_note: string
          _duration: number
          _meeting: string
          _starts: string
        }
        Returns: Json
      }
      confirm_mentorship_session_tx: {
        Args: { _meeting: string; _scheduled: string; _session_id: string }
        Returns: Json
      }
      process_site_order: {
        Args: { _payload: Json; _source: string }
        Returns: Json
      }
      release_calendar_sync: {
        Args: {
          _appointment_id: string
          _error_code: string
          _event_id: string
          _meet_url: string
          _status: string
          _token: string
        }
        Returns: boolean
      }
      save_clinical_record_tx: {
        Args: {
          _appointment_id: string
          _auth_tag: string
          _author: string
          _author_email: string
          _ciphertext: string
          _customer_id: string
          _iv: string
          _order_id: string
          _record_id: string
          _session_date: string
          _session_number: number
        }
        Returns: string
      }
      sync_appointment_session: {
        Args: {
          _appointment_id: string
          _duration: number
          _meeting: string
          _scheduled: string
          _title: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "superadmin" | "colaborador"
      appointment_status:
        | "solicitada"
        | "agendada"
        | "confirmada"
        | "concluida"
        | "cancelada"
        | "reagendada"
      delivery_event_type:
        | "entregue"
        | "aprovada"
        | "ajuste_solicitado"
        | "comentario"
        | "revisada"
      delivery_status:
        | "pendente"
        | "em_producao"
        | "em_revisao"
        | "entregue"
        | "cancelada"
        | "ajustes_solicitados"
        | "aprovada"
      mentorship_status:
        | "intake"
        | "aguardando_pagamento"
        | "aguardando_agendamento"
        | "agendada"
        | "em_andamento"
        | "concluida"
        | "cancelada"
      order_status:
        | "novo"
        | "em_analise"
        | "em_andamento"
        | "aguardando_cliente"
        | "em_revisao"
        | "concluido"
        | "cancelado"
      payment_status:
        | "pendente"
        | "pago"
        | "reembolsado"
        | "falhou"
        | "parcialmente_reembolsado"
      priority_level: "baixa" | "media" | "alta" | "urgente"
      service_type:
        | "recrutamento_selecao"
        | "site"
        | "mentoria"
        | "produto_digital"
        | "palestra"
        | "outros"
      session_status: "agendada" | "concluida" | "cancelada" | "reagendada"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["superadmin", "colaborador"],
      appointment_status: [
        "solicitada",
        "agendada",
        "confirmada",
        "concluida",
        "cancelada",
        "reagendada",
      ],
      delivery_event_type: [
        "entregue",
        "aprovada",
        "ajuste_solicitado",
        "comentario",
        "revisada",
      ],
      delivery_status: [
        "pendente",
        "em_producao",
        "em_revisao",
        "entregue",
        "cancelada",
        "ajustes_solicitados",
        "aprovada",
      ],
      mentorship_status: [
        "intake",
        "aguardando_pagamento",
        "aguardando_agendamento",
        "agendada",
        "em_andamento",
        "concluida",
        "cancelada",
      ],
      order_status: [
        "novo",
        "em_analise",
        "em_andamento",
        "aguardando_cliente",
        "em_revisao",
        "concluido",
        "cancelado",
      ],
      payment_status: [
        "pendente",
        "pago",
        "reembolsado",
        "falhou",
        "parcialmente_reembolsado",
      ],
      priority_level: ["baixa", "media", "alta", "urgente"],
      service_type: [
        "recrutamento_selecao",
        "site",
        "mentoria",
        "produto_digital",
        "palestra",
        "outros",
      ],
      session_status: ["agendada", "concluida", "cancelada", "reagendada"],
    },
  },
} as const
