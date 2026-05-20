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
      events: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          location: string
          start_time: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          location: string
          start_time: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          location?: string
          start_time?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      event_type: "Training" | "Spiel" | "Event"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type EventType = Database["public"]["Enums"]["event_type"];
