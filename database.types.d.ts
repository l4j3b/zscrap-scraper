export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string;
          id: string;
          key: string;
          key_suffix: string;
          organization_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key: string;
          key_suffix: string;
          organization_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key?: string;
          key_suffix?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_organizations_id_fk";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      organizations: {
        Row: {
          api_credits: number;
          created_at: string;
          id: string;
          name: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          api_credits?: number;
          created_at?: string;
          id?: string;
          name: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          api_credits?: number;
          created_at?: string;
          id?: string;
          name?: string;
          stripe_customer_id?: string | null;
        };
        Relationships: [];
      };
      scraper_urls: {
        Row: {
          created_at: string;
          error: string | null;
          html: string | null;
          id: string;
          json_result: Json | null;
          organization_id: string;
          result: string | null;
          scraper_id: string;
          status: Database["public"]["Enums"]["scraper_url_status"];
          suggestion: string | null;
          text: string | null;
          title: string | null;
          updated_at: string;
          url: string;
          usage_info: Json | null;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          html?: string | null;
          id?: string;
          json_result?: Json | null;
          organization_id: string;
          result?: string | null;
          scraper_id: string;
          status?: Database["public"]["Enums"]["scraper_url_status"];
          suggestion?: string | null;
          text?: string | null;
          title?: string | null;
          updated_at?: string;
          url: string;
          usage_info?: Json | null;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          html?: string | null;
          id?: string;
          json_result?: Json | null;
          organization_id?: string;
          result?: string | null;
          scraper_id?: string;
          status?: Database["public"]["Enums"]["scraper_url_status"];
          suggestion?: string | null;
          text?: string | null;
          title?: string | null;
          updated_at?: string;
          url?: string;
          usage_info?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "scraper_urls_organization_id_organizations_id_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scraper_urls_scraper_id_scrapers_id_fk";
            columns: ["scraper_id"];
            isOneToOne: false;
            referencedRelation: "scrapers";
            referencedColumns: ["id"];
          }
        ];
      };
      scrapers: {
        Row: {
          created_at: string;
          created_by_id: string;
          id: string;
          name: string;
          organization_id: string;
          prompt: string | null;
        };
        Insert: {
          created_at?: string;
          created_by_id: string;
          id?: string;
          name: string;
          organization_id: string;
          prompt?: string | null;
        };
        Update: {
          created_at?: string;
          created_by_id?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          prompt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scrapers_created_by_id_users_id_fk";
            columns: ["created_by_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scrapers_organization_id_organizations_id_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      subscriptions: {
        Row: {
          created_at: string;
          ends_at: string | null;
          id: string;
          plan_id: Database["public"]["Enums"]["plan_id"] | null;
          renews_at: string | null;
          subscription_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          plan_id?: Database["public"]["Enums"]["plan_id"] | null;
          renews_at?: string | null;
          subscription_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          plan_id?: Database["public"]["Enums"]["plan_id"] | null;
          renews_at?: string | null;
          subscription_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          is_admin: boolean;
          username: string;
          whitelisted: boolean;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          email: string;
          id?: string;
          is_admin?: boolean;
          username: string;
          whitelisted?: boolean;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          is_admin?: boolean;
          username?: string;
          whitelisted?: boolean;
        };
        Relationships: [];
      };
      users_to_organizations: {
        Row: {
          created_at: string;
          organization_id: string;
          role: Database["public"]["Enums"]["organization_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["organization_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["organization_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_to_organizations_organization_id_organizations_id_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_to_organizations_user_id_users_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_api_credit: {
        Args: {
          org_id: string;
        };
        Returns: {
          updated_credits: number;
        }[];
      };
      deduct_api_credit: {
        Args: {
          org_id: string;
        };
        Returns: {
          updated_credits: number;
          credits_deducted: boolean;
        }[];
      };
    };
    Enums: {
      organization_role: "owner" | "admin" | "member";
      plan_id: "PRO_DAILY" | "PRO_MONTHLY" | "PRO_YEARLY";
      scraper_url_status: "pending" | "processing" | "completed" | "failed";
      stripe_product:
        | "free"
        | "proSubscriptionDaily"
        | "proSubscriptionMonthly"
        | "proSubscriptionYearly";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never;
