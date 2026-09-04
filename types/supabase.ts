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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ax_evaluations: {
        Row: {
          evaluated_at: string
          evaluated_by: string
          id: string
          path_suggestion: string | null
          reason_data: string | null
          reason_effect: string | null
          reason_feasibility: string | null
          reason_risk: string | null
          reason_scalability: string | null
          recommendation: string | null
          score_data: number | null
          score_effect: number | null
          score_feasibility: number | null
          score_risk: number | null
          score_scalability: number | null
          task_id: string
          total_score: number | null
        }
        Insert: {
          evaluated_at?: string
          evaluated_by?: string
          id?: string
          path_suggestion?: string | null
          reason_data?: string | null
          reason_effect?: string | null
          reason_feasibility?: string | null
          reason_risk?: string | null
          reason_scalability?: string | null
          recommendation?: string | null
          score_data?: number | null
          score_effect?: number | null
          score_feasibility?: number | null
          score_risk?: number | null
          score_scalability?: number | null
          task_id: string
          total_score?: number | null
        }
        Update: {
          evaluated_at?: string
          evaluated_by?: string
          id?: string
          path_suggestion?: string | null
          reason_data?: string | null
          reason_effect?: string | null
          reason_feasibility?: string | null
          reason_risk?: string | null
          reason_scalability?: string | null
          recommendation?: string | null
          score_data?: number | null
          score_effect?: number | null
          score_feasibility?: number | null
          score_risk?: number | null
          score_scalability?: number | null
          task_id?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ax_evaluations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      gates: {
        Row: {
          checklist: Json | null
          gate_number: number
          id: string
          requested_at: string | null
          requested_by: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_id: string
        }
        Insert: {
          checklist?: Json | null
          gate_number: number
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id: string
        }
        Update: {
          checklist?: Json | null
          gate_number?: number
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gates_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
          used_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: string
          token?: string
          used_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_records: {
        Row: {
          baseline: number | null
          current_value: number | null
          id: string
          kpi_category: string
          kpi_name: string
          measured_at: string
          measured_by: string | null
          target_value: number | null
          task_id: string
          unit: string | null
        }
        Insert: {
          baseline?: number | null
          current_value?: number | null
          id?: string
          kpi_category: string
          kpi_name: string
          measured_at?: string
          measured_by?: string | null
          target_value?: number | null
          task_id: string
          unit?: string | null
        }
        Update: {
          baseline?: number | null
          current_value?: number | null
          id?: string
          kpi_category?: string
          kpi_name?: string
          measured_at?: string
          measured_by?: string | null
          target_value?: number | null
          task_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_records_measured_by_fkey"
            columns: ["measured_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_records_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          task_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          task_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          task_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pbl_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          stage_number: number
          task_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          stage_number: number
          task_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          stage_number?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pbl_chat_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pbl_outputs: {
        Row: {
          content: string | null
          created_at: string
          id: string
          output_type: string
          pending_items: Json | null
          stage_number: number
          task_id: string
          updated_at: string
          version: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          output_type: string
          pending_items?: Json | null
          stage_number: number
          task_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          output_type?: string
          pending_items?: Json | null
          stage_number?: number
          task_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pbl_outputs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pbl_stages: {
        Row: {
          completed_at: string | null
          id: string
          stage_number: number
          started_at: string | null
          status: string
          task_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          stage_number: number
          started_at?: string | null
          status?: string
          task_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          stage_number?: number
          started_at?: string | null
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pbl_stages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: string | null
          file_path: string | null
          generated_at: string
          generated_by: string | null
          id: string
          report_type: string
          task_id: string
          title: string
        }
        Insert: {
          content?: string | null
          file_path?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_type: string
          task_id: string
          title: string
        }
        Update: {
          content?: string | null
          file_path?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_type?: string
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_files: {
        Row: {
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          task_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ax_path: string | null
          ax_total_score: number | null
          background: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_status: string
          description: string | null
          expected_effect: string | null
          id: string
          process_owner_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ax_path?: string | null
          ax_total_score?: number | null
          background?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_status?: string
          description?: string | null
          expected_effect?: string | null
          id?: string
          process_owner_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ax_path?: string | null
          ax_total_score?: number | null
          background?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_status?: string
          description?: string | null
          expected_effect?: string | null
          id?: string
          process_owner_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_process_owner_id_fkey"
            columns: ["process_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          status: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          role: string
          status?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_company_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
