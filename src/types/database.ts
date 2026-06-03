// Supabase 스키마 타입 (단일 진실 소스: supabase/schema.sql + migrations/)
// 컬럼/테이블 변경 시 이 파일도 함께 갱신할 것.
// 가능하면 `supabase gen types typescript`로 재생성하는 것을 권장.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          slug: string;
          content: string;
          excerpt: string | null;
          cover_image: string | null;
          cover_image_alt: string | null;
          published: boolean;
          featured: boolean;
          view_count: number;
          meta_title: string | null;
          meta_description: string | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
          // case / procedure 메타 (nullable)
          case_type: string | null;
          category_id: string | null;
          current_stage: string | null;
          next_stage: string | null;
          estimated_duration: string | null;
          involved_agencies: string[] | null;
          common_mistakes: string[] | null;
          timeline_steps: string[] | null;
          expert_level: string | null;
          // 신뢰 배지
          is_ai_assisted: boolean | null;
          reviewed_at: string | null;
          // pgvector (1536) — supabase-js는 문자열로 직렬화하여 반환
          embedding: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          slug: string;
          content: string;
          excerpt?: string | null;
          cover_image?: string | null;
          cover_image_alt?: string | null;
          published?: boolean;
          featured?: boolean;
          view_count?: number;
          meta_title?: string | null;
          meta_description?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          case_type?: string | null;
          category_id?: string | null;
          current_stage?: string | null;
          next_stage?: string | null;
          estimated_duration?: string | null;
          involved_agencies?: string[] | null;
          common_mistakes?: string[] | null;
          timeline_steps?: string[] | null;
          expert_level?: string | null;
          is_ai_assisted?: boolean | null;
          reviewed_at?: string | null;
          embedding?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          nickname: string | null;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nickname?: string | null;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
        Relationships: [];
      };
      post_tags: {
        Row: {
          post_id: string;
          tag_id: string;
        };
        Insert: {
          post_id: string;
          tag_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_tags"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          seo_title: string | null;
          seo_description: string | null;
          post_count: number;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          post_count?: number;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      images: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          alt: string | null;
          width: number | null;
          height: number | null;
          size: number | null;
          mime_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          alt?: string | null;
          width?: number | null;
          height?: number | null;
          size?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["images"]["Insert"]>;
        Relationships: [];
      };
      post_views: {
        Row: {
          id: string;
          post_id: string;
          viewed_at: string;
          ip_hash: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          viewed_at?: string;
          ip_hash?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["post_views"]["Insert"]>;
        Relationships: [];
      };
      post_revisions: {
        Row: {
          id: string;
          post_id: string;
          title: string;
          content: string;
          excerpt: string | null;
          revision_number: number;
          created_by: string;
          created_at: string;
          meta_title: string | null;
          meta_description: string | null;
          cover_image: string | null;
          cover_image_alt: string | null;
          slug: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          title: string;
          content: string;
          excerpt?: string | null;
          revision_number?: number;
          created_by: string;
          created_at?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          cover_image?: string | null;
          cover_image_alt?: string | null;
          slug?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["post_revisions"]["Insert"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          parent_id: string | null;
          user_id: string | null;
          nickname: string | null;
          content: string;
          is_anonymous: boolean | null;
          is_secret: boolean | null;
          status: string;
          risk_score: number | null;
          question_type: string | null;
          topic_tags: string[] | null;
          context_answers: Json | null;
          is_edited: boolean | null;
          edited_at: string | null;
          like_count: number | null;
          reply_count: number | null;
          view_count: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          embedding: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          parent_id?: string | null;
          user_id?: string | null;
          nickname?: string | null;
          content: string;
          is_anonymous?: boolean | null;
          is_secret?: boolean | null;
          status?: string;
          risk_score?: number | null;
          question_type?: string | null;
          topic_tags?: string[] | null;
          context_answers?: Json | null;
          is_edited?: boolean | null;
          edited_at?: string | null;
          like_count?: number | null;
          reply_count?: number | null;
          view_count?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          embedding?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
        Relationships: [];
      };
      comment_history: {
        Row: {
          id: string;
          comment_id: string;
          old_content: string;
          new_content: string;
          edited_by: string | null;
          edited_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          old_content: string;
          new_content: string;
          edited_by?: string | null;
          edited_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comment_history"]["Insert"]>;
        Relationships: [];
      };
      comment_likes: {
        Row: {
          id: string;
          comment_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comment_likes"]["Insert"]>;
        Relationships: [];
      };
      comment_reports: {
        Row: {
          id: string;
          comment_id: string;
          reporter_id: string | null;
          reason: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          reporter_id?: string | null;
          reason: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comment_reports"]["Insert"]>;
        Relationships: [];
      };
      situations_cache: {
        Row: {
          id: string;
          phrase: string;
          case_type: string | null;
          source_post_id: string | null;
          score: number;
          generated_at: string;
          target_url: string | null;
          situation_slug: string | null;
        };
        Insert: {
          id?: string;
          phrase: string;
          case_type?: string | null;
          source_post_id?: string | null;
          score?: number;
          generated_at?: string;
          target_url?: string | null;
          situation_slug?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["situations_cache"]["Insert"]>;
        Relationships: [];
      };
      internal_link_keywords: {
        Row: {
          id: string;
          keyword: string;
          url: string;
          priority: number;
          category: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          keyword: string;
          url: string;
          priority?: number;
          category?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["internal_link_keywords"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
