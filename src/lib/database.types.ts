// Generated from the live schema with the Supabase MCP server's
// generate_typescript_types, trimmed to the Database type. Regenerate after
// every migration.

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      friendships: {
        Row: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          status: string;
        };
        Insert: {
          addressee_id: string;
          created_at?: string;
          id?: string;
          requester_id?: string;
          status?: string;
        };
        Update: {
          addressee_id?: string;
          created_at?: string;
          id?: string;
          requester_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey";
            columns: ["addressee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "friendships_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      library_items: {
        Row: {
          added_at: string;
          author: string | null;
          cover_id: number | null;
          id: string;
          ol_key: string;
          title: string;
          user_id: string;
          year: number | null;
        };
        Insert: {
          added_at?: string;
          author?: string | null;
          cover_id?: number | null;
          id?: string;
          ol_key: string;
          title: string;
          user_id?: string;
          year?: number | null;
        };
        Update: {
          added_at?: string;
          author?: string | null;
          cover_id?: number | null;
          id?: string;
          ol_key?: string;
          title?: string;
          user_id?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "library_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      posts: {
        Row: {
          body: string;
          book_author: string | null;
          book_ol_key: string | null;
          book_title: string | null;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          book_author?: string | null;
          book_ol_key?: string | null;
          book_title?: string | null;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Update: {
          body?: string;
          book_author?: string | null;
          book_ol_key?: string | null;
          book_title?: string | null;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type LibraryItem = Database["public"]["Tables"]["library_items"]["Row"];
