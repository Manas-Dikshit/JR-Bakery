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
      audit_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          method: string
          notes: string | null
          payment_date: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          credit_limit: number
          id: string
          name: string
          outstanding: number
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          credit_limit?: number
          id?: string
          name: string
          outstanding?: number
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          credit_limit?: number
          id?: string
          name?: string
          outstanding?: number
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_closing: {
        Row: {
          cash_variance: number
          closing_cash: number
          closing_date: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          opening_cash: number
          total_expenses: number
          total_sales: number
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          cash_variance?: number
          closing_cash?: number
          closing_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          opening_cash?: number
          total_expenses?: number
          total_sales?: number
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          cash_variance?: number
          closing_cash?: number
          closing_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          opening_cash?: number
          total_expenses?: number
          total_sales?: number
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          active: boolean
          avg_cost: number
          category: string | null
          code: string | null
          created_at: string
          current_price: number
          current_stock: number
          id: string
          min_stock: number
          name: string
          reorder_level: number
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          avg_cost?: number
          category?: string | null
          code?: string | null
          created_at?: string
          current_price?: number
          current_stock?: number
          id?: string
          min_stock?: number
          name: string
          reorder_level?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          avg_cost?: number
          category?: string | null
          code?: string | null
          created_at?: string
          current_price?: number
          current_stock?: number
          id?: string
          min_stock?: number
          name?: string
          reorder_level?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      production: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          operator_id: string | null
          product_id: string
          production_date: string
          quantity: number
          shift: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          product_id: string
          production_date?: string
          quantity: number
          shift?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          product_id?: string
          production_date?: string
          quantity?: number
          shift?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          code: string | null
          created_at: string
          id: string
          name: string
          selling_price: number
          unit_weight: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          selling_price?: number
          unit_weight?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          selling_price?: number
          unit_weight?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          bill_url: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          material_id: string
          notes: string | null
          purchase_date: string
          quantity: number
          supplier_id: string | null
          tax: number
          total_amount: number
          unit_price: number
        }
        Insert: {
          bill_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          material_id: string
          notes?: string | null
          purchase_date?: string
          quantity: number
          supplier_id?: string | null
          tax?: number
          total_amount: number
          unit_price: number
        }
        Update: {
          bill_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          material_id?: string
          notes?: string | null
          purchase_date?: string
          quantity?: number
          supplier_id?: string | null
          tax?: number
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_items: {
        Row: {
          created_at: string
          id: string
          material_id: string
          product_id: string
          quantity_per_unit: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          product_id: string
          quantity_per_unit: number
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          product_id?: string
          quantity_per_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          invoice_no: string | null
          notes: string | null
          paid_amount: number
          payment_type: string
          product_id: string
          quantity: number
          sale_date: string
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_no?: string | null
          notes?: string | null
          paid_amount?: number
          payment_type?: string
          product_id: string
          quantity: number
          sale_date?: string
          total_amount: number
          unit_price: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_no?: string | null
          notes?: string | null
          paid_amount?: number
          payment_type?: string
          product_id?: string
          quantity?: number
          sale_date?: string
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_date: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          material_id: string
          notes: string | null
          quantity_delta: number
          reason: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adjustment_date?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          quantity_delta: number
          reason: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adjustment_date?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          quantity_delta?: number
          reason?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          method: string
          notes: string | null
          payment_date: string
          reference: string | null
          supplier_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          name: string
          outstanding: number
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          outstanding?: number
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          outstanding?: number
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      waste: {
        Row: {
          created_at: string
          created_by: string | null
          est_value: number
          id: string
          product_id: string | null
          quantity: number
          reason: string | null
          waste_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          est_value?: number
          id?: string
          product_id?: string | null
          quantity: number
          reason?: string | null
          waste_date?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          est_value?: number
          id?: string
          product_id?: string | null
          quantity?: number
          reason?: string | null
          waste_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "manager" | "operator" | "viewer"
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
      app_role: ["super_admin", "manager", "operator", "viewer"],
    },
  },
} as const
