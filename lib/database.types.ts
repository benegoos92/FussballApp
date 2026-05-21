export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      duties: {
        Row: { created_at: string; id: string; player_id: string; scheduled_date: string; swap_approved: boolean | null; swap_requested_to: string | null; type_id: string }
        Insert: { created_at?: string; id?: string; player_id: string; scheduled_date: string; swap_approved?: boolean | null; swap_requested_to?: string | null; type_id: string }
        Update: { created_at?: string; id?: string; player_id?: string; scheduled_date?: string; swap_approved?: boolean | null; swap_requested_to?: string | null; type_id?: string }
        Relationships: []
      }
      duty_types: {
        Row: { active: boolean; created_at: string; cycle_days: number; description: string | null; id: string; name: string; players_needed: number }
        Insert: { active?: boolean; created_at?: string; cycle_days?: number; description?: string | null; id?: string; name: string; players_needed?: number }
        Update: { active?: boolean; created_at?: string; cycle_days?: number; description?: string | null; id?: string; name?: string; players_needed?: number }
        Relationships: []
      }
      event_attendances: {
        Row: { created_at: string; event_id: string; id: string; player_id: string; reason: string | null; status: Database["public"]["Enums"]["attendance_status"]; updated_at: string }
        Insert: { created_at?: string; event_id: string; id?: string; player_id: string; reason?: string | null; status?: Database["public"]["Enums"]["attendance_status"]; updated_at?: string }
        Update: { created_at?: string; event_id?: string; id?: string; player_id?: string; reason?: string | null; status?: Database["public"]["Enums"]["attendance_status"]; updated_at?: string }
        Relationships: []
      }
      events: {
        Row: { created_at: string; date: string; description: string | null; id: string; location: string; start_time: string; title: string; type: Database["public"]["Enums"]["event_type"]; updated_at: string }
        Insert: { created_at?: string; date: string; description?: string | null; id?: string; location: string; start_time: string; title: string; type: Database["public"]["Enums"]["event_type"]; updated_at?: string }
        Update: { created_at?: string; date?: string; description?: string | null; id?: string; location?: string; start_time?: string; title?: string; type?: Database["public"]["Enums"]["event_type"]; updated_at?: string }
        Relationships: []
      }
      jersey_assignments: {
        Row: { created_at: string; event_id: string; id: string; jersey_id: string; player_id: string }
        Insert: { created_at?: string; event_id: string; id?: string; jersey_id: string; player_id: string }
        Update: { created_at?: string; event_id?: string; id?: string; jersey_id?: string; player_id?: string }
        Relationships: []
      }
      jersey_sets: {
        Row: { created_at: string; id: string; name: string }
        Insert: { created_at?: string; id?: string; name: string }
        Update: { created_at?: string; id?: string; name?: string }
        Relationships: []
      }
      jerseys: {
        Row: { created_at: string; id: string; number: number; set_id: string; size: string; status: Database["public"]["Enums"]["jersey_status"] }
        Insert: { created_at?: string; id?: string; number: number; set_id: string; size: string; status?: Database["public"]["Enums"]["jersey_status"] }
        Update: { created_at?: string; id?: string; number?: number; set_id?: string; size?: string; status?: Database["public"]["Enums"]["jersey_status"] }
        Relationships: []
      }
      penalties: {
        Row: { amount: number; created_at: string; doubled: boolean; due_date: string; id: string; paid_at: string | null; player_id: string; reason: string | null; status: Database["public"]["Enums"]["penalty_status"]; type_id: string; updated_at: string }
        Insert: { amount: number; created_at?: string; doubled?: boolean; due_date: string; id?: string; paid_at?: string | null; player_id: string; reason?: string | null; status?: Database["public"]["Enums"]["penalty_status"]; type_id: string; updated_at?: string }
        Update: { amount?: number; created_at?: string; doubled?: boolean; due_date?: string; id?: string; paid_at?: string | null; player_id?: string; reason?: string | null; status?: Database["public"]["Enums"]["penalty_status"]; type_id?: string; updated_at?: string }
        Relationships: []
      }
      penalty_types: {
        Row: { amount: number; created_at: string; description: string | null; id: string; name: string }
        Insert: { amount: number; created_at?: string; description?: string | null; id?: string; name: string }
        Update: { amount?: number; created_at?: string; description?: string | null; id?: string; name?: string }
        Relationships: []
      }
      players: {
        Row: { active: boolean; created_at: string; email: string | null; id: string; jersey_number: number | null; name: string; phone: string | null; photo_url: string | null; position: string | null; size: string | null; updated_at: string }
        Insert: { active?: boolean; created_at?: string; email?: string | null; id?: string; jersey_number?: number | null; name: string; phone?: string | null; photo_url?: string | null; position?: string | null; size?: string | null; updated_at?: string }
        Update: { active?: boolean; created_at?: string; email?: string | null; id?: string; jersey_number?: number | null; name?: string; phone?: string | null; photo_url?: string | null; position?: string | null; size?: string | null; updated_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      attendance_status: "zusage" | "absage" | "ausstehend"
      event_type: "Training" | "Spiel" | "Event"
      jersey_status: "verfügbar" | "vergeben" | "beschädigt"
      penalty_status: "offen" | "bezahlt"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Player = Database["public"]["Tables"]["players"]["Row"]
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"]
export type Event = Database["public"]["Tables"]["events"]["Row"]
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"]
export type EventType = Database["public"]["Enums"]["event_type"]
export type Attendance = Database["public"]["Tables"]["event_attendances"]["Row"]
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"]
export type PenaltyType = Database["public"]["Tables"]["penalty_types"]["Row"]
export type Penalty = Database["public"]["Tables"]["penalties"]["Row"]
export type PenaltyStatus = Database["public"]["Enums"]["penalty_status"]
export type DutyType = Database["public"]["Tables"]["duty_types"]["Row"]
export type Duty = Database["public"]["Tables"]["duties"]["Row"]
export type JerseySet = Database["public"]["Tables"]["jersey_sets"]["Row"]
export type Jersey = Database["public"]["Tables"]["jerseys"]["Row"]
export type JerseyStatus = Database["public"]["Enums"]["jersey_status"]
export type JerseyAssignment = Database["public"]["Tables"]["jersey_assignments"]["Row"]

export const SIZES = ["XS","S","M","L","XL","XXL","XXXL"] as const
export const POSITIONS = ["Tor","Abwehr","Mittelfeld","Angriff"] as const
