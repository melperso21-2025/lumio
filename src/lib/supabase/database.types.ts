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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accounts_receivable: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          customer_id: string | null
          deleted_at: string | null
          due_date: string
          id: string
          invoice_ref: string | null
          issue_date: string
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          due_date: string
          id?: string
          invoice_ref?: string | null
          issue_date?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          due_date?: string
          id?: string
          invoice_ref?: string | null
          issue_date?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          attributed_revenue: number | null
          campaign_date: string
          campaign_name: string | null
          clicks: number | null
          company_id: string
          conversion_rate: number | null
          cpm: number | null
          created_at: string | null
          creative_name: string | null
          ctr: number | null
          deleted_at: string | null
          effectiveness_rate: number | null
          id: string
          impressions: number | null
          leads_count: number | null
          metadata: Json | null
          platform: string | null
          quality_leads: number | null
          reach: number | null
          roas: number | null
          spend: number
          tags: string[] | null
          transactions: number | null
          updated_at: string | null
          week_number: number | null
          year: number | null
        }
        Insert: {
          attributed_revenue?: number | null
          campaign_date: string
          campaign_name?: string | null
          clicks?: number | null
          company_id: string
          conversion_rate?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_name?: string | null
          ctr?: number | null
          deleted_at?: string | null
          effectiveness_rate?: number | null
          id?: string
          impressions?: number | null
          leads_count?: number | null
          metadata?: Json | null
          platform?: string | null
          quality_leads?: number | null
          reach?: number | null
          roas?: number | null
          spend?: number
          tags?: string[] | null
          transactions?: number | null
          updated_at?: string | null
          week_number?: number | null
          year?: number | null
        }
        Update: {
          attributed_revenue?: number | null
          campaign_date?: string
          campaign_name?: string | null
          clicks?: number | null
          company_id?: string
          conversion_rate?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_name?: string | null
          ctr?: number | null
          deleted_at?: string | null
          effectiveness_rate?: number | null
          id?: string
          impressions?: number | null
          leads_count?: number | null
          metadata?: Json | null
          platform?: string | null
          quality_leads?: number | null
          reach?: number | null
          roas?: number | null
          spend?: number
          tags?: string[] | null
          transactions?: number | null
          updated_at?: string | null
          week_number?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          company_id: string
          created_at: string | null
          executive_summary: string | null
          id: string
          insight_campaigns: string | null
          insight_finance: string | null
          insight_inventory: string | null
          insight_sales: string | null
          playbook: Json | null
          updated_at: string | null
          viewed_at: string | null
          week_number: number
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          executive_summary?: string | null
          id?: string
          insight_campaigns?: string | null
          insight_finance?: string | null
          insight_inventory?: string | null
          insight_sales?: string | null
          playbook?: Json | null
          updated_at?: string | null
          viewed_at?: string | null
          week_number: number
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          executive_summary?: string | null
          id?: string
          insight_campaigns?: string | null
          insight_finance?: string | null
          insight_inventory?: string | null
          insight_sales?: string | null
          playbook?: Json | null
          updated_at?: string | null
          viewed_at?: string | null
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_requests: {
        Row: {
          id: string
          company_id: string
          week_number: number
          year: number
          requested_by: string
          reviewed_by: string | null
          reason: string | null
          status: 'pending' | 'approved' | 'rejected' | 'done'
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          week_number: number
          year: number
          requested_by: string
          reviewed_by?: string | null
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'done'
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          week_number?: number
          year?: number
          requested_by?: string
          reviewed_by?: string | null
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'done'
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          session_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          session_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string | null
          bank_name: string
          company_id: string
          created_at: string | null
          current_balance: number | null
          deleted_at: string | null
          id: string
          initial_balance: number | null
          is_active: boolean | null
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          bank_name: string
          company_id: string
          created_at?: string | null
          current_balance?: number | null
          deleted_at?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          bank_name?: string
          company_id?: string
          created_at?: string | null
          current_balance?: number | null
          deleted_at?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          company_id: string
          concept: string | null
          created_at: string | null
          id: string
          is_fixed: boolean | null
          tx_date: string
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          company_id: string
          concept?: string | null
          created_at?: string | null
          id?: string
          is_fixed?: boolean | null
          tx_date?: string
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          company_id?: string
          concept?: string | null
          created_at?: string | null
          id?: string
          is_fixed?: boolean | null
          tx_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city_id: string | null
          company_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          manager_user_id: string | null
          metadata: Json | null
          name: string
          tags: string[] | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city_id?: string | null
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_user_id?: string | null
          metadata?: Json | null
          name: string
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city_id?: string | null
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_user_id?: string | null
          metadata?: Json | null
          name?: string
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          state_province: string | null
        }
        Insert: {
          country_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          state_province?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          state_province?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active_modules: string[] | null
          allow_user_invites: boolean
          branch_count: number | null
          city_id: string | null
          country_id: string | null
          created_at: string | null
          deleted_at: string | null
          fiscal_start_date: string | null
          id: string
          legal_rep_user_id: string | null
          max_users: number
          metadata: Json | null
          name: string
          operational_since: string | null
          plan: string
          pulse_notes: string | null
          sector: string | null
          status: string
          tags: string[] | null
          tax_id: string | null
          trial_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          active_modules?: string[] | null
          allow_user_invites?: boolean
          branch_count?: number | null
          city_id?: string | null
          country_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fiscal_start_date?: string | null
          id?: string
          legal_rep_user_id?: string | null
          max_users?: number
          metadata?: Json | null
          name: string
          operational_since?: string | null
          plan?: string
          pulse_notes?: string | null
          sector?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          active_modules?: string[] | null
          allow_user_invites?: boolean
          branch_count?: number | null
          city_id?: string | null
          country_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fiscal_start_date?: string | null
          id?: string
          legal_rep_user_id?: string | null
          max_users?: number
          metadata?: Json | null
          name?: string
          operational_since?: string | null
          plan?: string
          pulse_notes?: string | null
          sector?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_companies_legal_rep"
            columns: ["legal_rep_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string | null
          currency_code: string
          id: string
          is_active: boolean | null
          iso_code: string
          name: string
          tax_system: string | null
        }
        Insert: {
          created_at?: string | null
          currency_code?: string
          id?: string
          is_active?: boolean | null
          iso_code: string
          name: string
          tax_system?: string | null
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          id?: string
          is_active?: boolean | null
          iso_code?: string
          name?: string
          tax_system?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          company_id: string
          created_at: string | null
          customer_type: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          label: string | null
          last_purchase_at: string | null
          lifetime_value: number | null
          metadata: Json | null
          origin_channel_id: string | null
          phone: string | null
          registered_since: string | null
          tags: string[] | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          customer_type?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          label?: string | null
          last_purchase_at?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          origin_channel_id?: string | null
          phone?: string | null
          registered_since?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          customer_type?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          label?: string | null
          last_purchase_at?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          origin_channel_id?: string | null
          phone?: string | null
          registered_since?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_origin_channel_id_fkey"
            columns: ["origin_channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          movement_date: string
          notes: string | null
          product_id: string
          quantity: number
          reason: string | null
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          movement_date?: string
          notes?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          movement_date?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          changed_by_user_id: string | null
          company_id: string
          created_at: string | null
          effective_from: string
          effective_to: string | null
          id: string
          product_id: string
          sale_price: number
          unit_cost: number
        }
        Insert: {
          changed_by_user_id?: string | null
          company_id: string
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          product_id: string
          sale_price: number
          unit_cost: number
        }
        Update: {
          changed_by_user_id?: string | null
          company_id?: string
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          product_id?: string
          sale_price?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string | null
          current_stock: number | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          metadata: Json | null
          min_stock_alert: number | null
          name: string
          sale_price: number | null
          sku: string | null
          supplier_id: string | null
          tags: string[] | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string | null
          current_stock?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          metadata?: Json | null
          min_stock_alert?: number | null
          name: string
          sale_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          tags?: string[] | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          current_stock?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          metadata?: Json | null
          min_stock_alert?: number | null
          name?: string
          sale_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          tags?: string[] | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_metrics: {
        Row: {
          activation_rate: number | null
          avg_ttfi_minutes: number | null
          churn_rate: number | null
          company_id: string
          created_at: string | null
          id: string
          mrr: number | null
          north_star_count: number | null
          notes: string | null
          nps_score: number | null
          retention_day30: number | null
          retention_week2: number | null
          traffic_light: string | null
          updated_at: string | null
          week_number: number
          year: number
        }
        Insert: {
          activation_rate?: number | null
          avg_ttfi_minutes?: number | null
          churn_rate?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          mrr?: number | null
          north_star_count?: number | null
          notes?: string | null
          nps_score?: number | null
          retention_day30?: number | null
          retention_week2?: number | null
          traffic_light?: string | null
          updated_at?: string | null
          week_number: number
          year: number
        }
        Update: {
          activation_rate?: number | null
          avg_ttfi_minutes?: number | null
          churn_rate?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          mrr?: number | null
          north_star_count?: number | null
          notes?: string | null
          nps_score?: number | null
          retention_day30?: number | null
          retention_week2?: number | null
          traffic_light?: string | null
          updated_at?: string | null
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          channel_id: string | null
          company_id: string
          created_at: string | null
          customer_id: string | null
          deleted_at: string | null
          discount_amount: number | null
          gross_total: number
          id: string
          lines_per_order: number | null
          metadata: Json | null
          notes: string | null
          production_cost: number | null
          sale_date: string
          seller_id: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          week_number: number | null
          year: number | null
        }
        Insert: {
          branch_id?: string | null
          channel_id?: string | null
          company_id: string
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          gross_total?: number
          id?: string
          lines_per_order?: number | null
          metadata?: Json | null
          notes?: string | null
          production_cost?: number | null
          sale_date?: string
          seller_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          week_number?: number | null
          year?: number | null
        }
        Update: {
          branch_id?: string | null
          channel_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          gross_total?: number
          id?: string
          lines_per_order?: number | null
          metadata?: Json | null
          notes?: string | null
          production_cost?: number | null
          sale_date?: string
          seller_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          week_number?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_channels: {
        Row: {
          commission_pct: number | null
          company_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          is_digital: boolean | null
          metadata: Json | null
          name: string
          platform: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          commission_pct?: number | null
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_digital?: boolean | null
          metadata?: Json | null
          name: string
          platform?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_pct?: number | null
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_digital?: boolean | null
          metadata?: Json | null
          name?: string
          platform?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          company_id: string
          contact_name: string | null
          country_id: string | null
          created_at: string | null
          default_lead_time_days: number | null
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          min_order_amount: number | null
          name: string
          payment_terms: string | null
          phone: string | null
          supplies_raw_material: boolean | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          contact_name?: string | null
          country_id?: string | null
          created_at?: string | null
          default_lead_time_days?: number | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          min_order_amount?: number | null
          name: string
          payment_terms?: string | null
          phone?: string | null
          supplies_raw_material?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          contact_name?: string | null
          country_id?: string | null
          created_at?: string | null
          default_lead_time_days?: number | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          min_order_amount?: number | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
          supplies_raw_material?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          is_pulse_admin: boolean | null
          job_title: string | null
          last_seen_at: string | null
          metadata: Json | null
          notify_email: boolean | null
          notify_whatsapp: boolean | null
          onboarded_at: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          full_name: string
          id: string
          is_pulse_admin?: boolean | null
          job_title?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          notify_email?: boolean | null
          notify_whatsapp?: boolean | null
          onboarded_at?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_pulse_admin?: boolean | null
          job_title?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          notify_email?: boolean | null
          notify_whatsapp?: boolean | null
          onboarded_at?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
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
      weekly_snapshots: {
        Row: {
          avg_ctr: number | null
          avg_effectiveness: number | null
          avg_lpp: number | null
          avg_roas: number | null
          avg_ticket: number | null
          cash_days: number | null
          company_id: string
          created_at: string | null
          fixed_vs_total_pct: number | null
          frozen_capital: number | null
          gross_margin_pct: number | null
          id: string
          inventory_days: number | null
          net_margin_pct: number | null
          overdue_receivables: number | null
          total_ad_spend: number | null
          total_discounts: number | null
          total_leads: number | null
          total_sales: number | null
          total_transactions: number | null
          updated_at: string | null
          week_number: number
          year: number
        }
        Insert: {
          avg_ctr?: number | null
          avg_effectiveness?: number | null
          avg_lpp?: number | null
          avg_roas?: number | null
          avg_ticket?: number | null
          cash_days?: number | null
          company_id: string
          created_at?: string | null
          fixed_vs_total_pct?: number | null
          frozen_capital?: number | null
          gross_margin_pct?: number | null
          id?: string
          inventory_days?: number | null
          net_margin_pct?: number | null
          overdue_receivables?: number | null
          total_ad_spend?: number | null
          total_discounts?: number | null
          total_leads?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string | null
          week_number: number
          year: number
        }
        Update: {
          avg_ctr?: number | null
          avg_effectiveness?: number | null
          avg_lpp?: number | null
          avg_roas?: number | null
          avg_ticket?: number | null
          cash_days?: number | null
          company_id?: string
          created_at?: string | null
          fixed_vs_total_pct?: number | null
          frozen_capital?: number | null
          gross_margin_pct?: number | null
          id?: string
          inventory_days?: number | null
          net_margin_pct?: number | null
          overdue_receivables?: number | null
          total_ad_spend?: number | null
          total_discounts?: number | null
          total_leads?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string | null
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_snapshots_company_id_fkey"
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
      calculate_weekly_snapshot: {
        Args: {
          p_company_id: string
          p_week_number: number
          p_year: number
        }
        Returns: undefined
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_pulse_admin: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
