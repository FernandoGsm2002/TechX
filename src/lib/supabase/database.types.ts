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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string
          customer_type: string | null
          document_id: string | null
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          last_name: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_type?: string | null
          document_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_type?: string | null
          document_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_brands: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_models: {
        Row: {
          brand_id: string
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "device_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          organization_id: string
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      guarantee_payments: {
        Row: {
          amount: number
          concept: string
          created_at: string
          guarantee_id: string
          id: string
          notes: string | null
          organization_id: string
          payment_method: string
          registered_by: string | null
        }
        Insert: {
          amount: number
          concept: string
          created_at?: string
          guarantee_id: string
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: string
          registered_by?: string | null
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string
          guarantee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string
          registered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guarantee_payments_guarantee_id_fkey"
            columns: ["guarantee_id"]
            isOneToOne: false
            referencedRelation: "guarantees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guarantee_payments_guarantee_id_fkey"
            columns: ["guarantee_id"]
            isOneToOne: false
            referencedRelation: "v_active_guarantees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guarantee_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      guarantees: {
        Row: {
          claim_count: number
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          servicio_id: string | null
          source: string
          start_date: string
          ticket_id: string | null
          updated_at: string
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
          warranty_type: string
        }
        Insert: {
          claim_count?: number
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          servicio_id?: string | null
          source?: string
          start_date?: string
          ticket_id?: string | null
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
          warranty_type?: string
        }
        Update: {
          claim_count?: number
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          servicio_id?: string | null
          source?: string
          start_date?: string
          ticket_id?: string | null
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
          warranty_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "guarantees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guarantees_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: true
            referencedRelation: "otros_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guarantees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guarantees_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          brand: string | null
          category: string | null
          condition: Database["public"]["Enums"]["stock_condition"]
          cost_price: number | null
          created_at: string
          id: string
          image_url: string | null
          item_type: Database["public"]["Enums"]["inventory_item_type"]
          min_stock: number
          model: string | null
          name: string
          notes: string | null
          organization_id: string
          quantity: number
          sell_price: number | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          condition?: Database["public"]["Enums"]["stock_condition"]
          cost_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_type?: Database["public"]["Enums"]["inventory_item_type"]
          min_stock?: number
          model?: string | null
          name: string
          notes?: string | null
          organization_id: string
          quantity?: number
          sell_price?: number | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          condition?: Database["public"]["Enums"]["stock_condition"]
          cost_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_type?: Database["public"]["Enums"]["inventory_item_type"]
          min_stock?: number
          model?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          quantity?: number
          sell_price?: number | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          movement_type: string
          notes: string | null
          organization_id: string
          performed_by: string | null
          quantity_after: number
          quantity_before: number
          quantity_delta: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          movement_type: string
          notes?: string | null
          organization_id: string
          performed_by?: string | null
          quantity_after: number
          quantity_before: number
          quantity_delta: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          movement_type?: string
          notes?: string | null
          organization_id?: string
          performed_by?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_delta?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          currency_code: string
          enable_otros_servicios: boolean
          id: string
          is_active: boolean
          is_approved: boolean
          logo_url: string | null
          name: string
          owner_name: string | null
          phone: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          print_width_mm: number | null
          receipt_footer: string | null
          receipt_notes: string | null
          requested_plan: Database["public"]["Enums"]["plan_type"] | null
          show_igv_breakdown: boolean | null
          show_logo_on_print: boolean | null
          subscription_end: string | null
          tax_id_name: string | null
          tax_id_number: string | null
          tax_percentage: number
          ticket_prefix: string | null
          updated_at: string
          warranty_days: number | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency_code?: string
          enable_otros_servicios?: boolean
          id?: string
          is_active?: boolean
          is_approved?: boolean
          logo_url?: string | null
          name: string
          owner_name?: string | null
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          print_width_mm?: number | null
          receipt_footer?: string | null
          receipt_notes?: string | null
          requested_plan?: Database["public"]["Enums"]["plan_type"] | null
          show_igv_breakdown?: boolean | null
          show_logo_on_print?: boolean | null
          subscription_end?: string | null
          tax_id_name?: string | null
          tax_id_number?: string | null
          tax_percentage?: number
          ticket_prefix?: string | null
          updated_at?: string
          warranty_days?: number | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          currency_code?: string
          enable_otros_servicios?: boolean
          id?: string
          is_active?: boolean
          is_approved?: boolean
          logo_url?: string | null
          name?: string
          owner_name?: string | null
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          print_width_mm?: number | null
          receipt_footer?: string | null
          receipt_notes?: string | null
          requested_plan?: Database["public"]["Enums"]["plan_type"] | null
          show_igv_breakdown?: boolean | null
          show_logo_on_print?: boolean | null
          subscription_end?: string | null
          tax_id_name?: string | null
          tax_id_number?: string | null
          tax_percentage?: number
          ticket_prefix?: string | null
          updated_at?: string
          warranty_days?: number | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      otros_servicios: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivered_at: string | null
          description: string | null
          device_brand: string | null
          device_model: string | null
          guest_name: string | null
          guest_phone: string | null
          has_pin: boolean | null
          id: string
          imei: string | null
          internal_notes: string | null
          order_number: string | null
          organization_id: string
          paid: boolean
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          pin_code: string | null
          price: number
          provider: string | null
          serial: string | null
          status: string
          tags: string[]
          ticket_id: string | null
          updated_at: string
          warranty_days: number | null
          warranty_notes: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          description?: string | null
          device_brand?: string | null
          device_model?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          has_pin?: boolean | null
          id?: string
          imei?: string | null
          internal_notes?: string | null
          order_number?: string | null
          organization_id: string
          paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pin_code?: string | null
          price?: number
          provider?: string | null
          serial?: string | null
          status?: string
          tags?: string[]
          ticket_id?: string | null
          updated_at?: string
          warranty_days?: number | null
          warranty_notes?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          description?: string | null
          device_brand?: string | null
          device_model?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          has_pin?: boolean | null
          id?: string
          imei?: string | null
          internal_notes?: string | null
          order_number?: string | null
          organization_id?: string
          paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pin_code?: string | null
          price?: number
          provider?: string | null
          serial?: string | null
          status?: string
          tags?: string[]
          ticket_id?: string | null
          updated_at?: string
          warranty_days?: number | null
          warranty_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "otros_servicios_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "otros_servicios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "otros_servicios_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "otros_servicios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "otros_servicios_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          organization_id: string | null
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          organization_id?: string | null
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          organization_id?: string | null
          p256dh?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          inventory_id: string
          quantity: number
          sale_id: string
          subtotal: number | null
          unit_price: number
        }
        Insert: {
          id?: string
          inventory_id: string
          quantity: number
          sale_id: string
          subtotal?: number | null
          unit_price: number
        }
        Update: {
          id?: string
          inventory_id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string
          payment_status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string
          payment_status?: string | null
          total_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string
          payment_status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      servicio_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          servicio_id: string
          status_from: string | null
          status_to: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          servicio_id: string
          status_from?: string | null
          status_to: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          servicio_id?: string
          status_from?: string | null
          status_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicio_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicio_history_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "otros_servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      servicio_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicio_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          status_from: Database["public"]["Enums"]["ticket_status"] | null
          status_to: Database["public"]["Enums"]["ticket_status"]
          ticket_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          status_from?: Database["public"]["Enums"]["ticket_status"] | null
          status_to: Database["public"]["Enums"]["ticket_status"]
          ticket_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          status_from?: Database["public"]["Enums"]["ticket_status"] | null
          status_to?: Database["public"]["Enums"]["ticket_status"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_images: {
        Row: {
          created_at: string
          id: string
          image_type: Database["public"]["Enums"]["image_type"]
          image_url: string
          organization_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_type?: Database["public"]["Enums"]["image_type"]
          image_url: string
          organization_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_type?: Database["public"]["Enums"]["image_type"]
          image_url?: string
          organization_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_images_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_images_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_items: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          organization_id: string
          quantity: number
          ticket_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          organization_id: string
          quantity?: number
          ticket_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          organization_id?: string
          quantity?: number
          ticket_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_items_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          checklist_entrada: Json
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivered_at: string | null
          device_details: Json
          diagnosis: string | null
          final_amount: number | null
          guest_name: string | null
          guest_phone: string | null
          has_lock: boolean | null
          id: string
          intake_notes: string | null
          is_warranty_claim: boolean
          lock_code: string | null
          lock_type: string | null
          organization_id: string
          paid_at: string | null
          parent_ticket_id: string | null
          payment_method: string | null
          payment_status: string | null
          power_on: boolean | null
          quote_amount: number | null
          received_at: string
          reported_issue: string | null
          signature_url: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
          warranty_days: number | null
        }
        Insert: {
          assigned_to?: string | null
          checklist_entrada?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          device_details?: Json
          diagnosis?: string | null
          final_amount?: number | null
          guest_name?: string | null
          guest_phone?: string | null
          has_lock?: boolean | null
          id?: string
          intake_notes?: string | null
          is_warranty_claim?: boolean
          lock_code?: string | null
          lock_type?: string | null
          organization_id: string
          paid_at?: string | null
          parent_ticket_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          power_on?: boolean | null
          quote_amount?: number | null
          received_at?: string
          reported_issue?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
          warranty_days?: number | null
        }
        Update: {
          assigned_to?: string | null
          checklist_entrada?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          device_details?: Json
          diagnosis?: string | null
          final_amount?: number | null
          guest_name?: string | null
          guest_phone?: string | null
          has_lock?: boolean | null
          id?: string
          intake_notes?: string | null
          is_warranty_claim?: boolean
          lock_code?: string | null
          lock_type?: string | null
          organization_id?: string
          paid_at?: string | null
          parent_ticket_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          power_on?: boolean | null
          quote_amount?: number | null
          received_at?: string
          reported_issue?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_active_guarantees: {
        Row: {
          claim_count: number | null
          created_at: string | null
          days_remaining: number | null
          end_date: string | null
          id: string | null
          is_active: boolean | null
          is_valid: boolean | null
          notes: string | null
          organization_id: string | null
          servicio_id: string | null
          source: string | null
          start_date: string | null
          ticket_id: string | null
          updated_at: string | null
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
          warranty_type: string | null
        }
        Insert: {
          claim_count?: number | null
          created_at?: string | null
          days_remaining?: never
          end_date?: string | null
          id?: string | null
          is_active?: boolean | null
          is_valid?: never
          notes?: string | null
          organization_id?: string | null
          servicio_id?: string | null
          source?: string | null
          start_date?: string | null
          ticket_id?: string | null
          updated_at?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
          warranty_type?: string | null
        }
        Update: {
          claim_count?: number | null
          created_at?: string | null
          days_remaining?: never
          end_date?: string | null
          id?: string | null
          is_active?: boolean | null
          is_valid?: never
          notes?: string | null
          organization_id?: string | null
          servicio_id?: string | null
          source?: string | null
          start_date?: string | null
          ticket_id?: string | null
          updated_at?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
          warranty_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guarantees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guarantees_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: true
            referencedRelation: "otros_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guarantees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guarantees_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_organization: { Args: { org_id: string }; Returns: undefined }
      bulk_adjust_stock: {
        Args: { p_adjustments: Json; p_organization_id: string }
        Returns: Json
      }
      decrement_stock: {
        Args: {
          p_inventory_id: string
          p_notes?: string
          p_performed_by?: string
          p_qty: number
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: undefined
      }
      get_my_org_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_org_active: { Args: { org_id: string }; Returns: boolean }
      reject_organization: { Args: { org_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      device_type: "movil" | "laptop" | "consola" | "tablet" | "otro"
      image_type: "entrada" | "salida" | "proceso"
      inventory_item_type: "producto" | "repuesto_propio" | "repuesto_comprado"
      plan_type:
        | "3_meses"
        | "6_meses"
        | "1_anio"
        | "free"
        | "basic"
        | "pro"
        | "enterprise"
      stock_condition: "nuevo" | "usado" | "desguace"
      ticket_status:
        | "recibido"
        | "en_proceso"
        | "fallido"
        | "completado"
        | "entregado"
      ticket_status_old:
        | "recibido"
        | "en_proceso"
        | "listo"
        | "entregado"
        | "garantia"
        | "cancelado"
        | "fallido"
        | "completado"
      user_role: "superadmin" | "admin" | "tecnico"
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
      device_type: ["movil", "laptop", "consola", "tablet", "otro"],
      image_type: ["entrada", "salida", "proceso"],
      inventory_item_type: ["producto", "repuesto_propio", "repuesto_comprado"],
      plan_type: [
        "3_meses",
        "6_meses",
        "1_anio",
        "free",
        "basic",
        "pro",
        "enterprise",
      ],
      stock_condition: ["nuevo", "usado", "desguace"],
      ticket_status: [
        "recibido",
        "en_proceso",
        "fallido",
        "completado",
        "entregado",
      ],
      ticket_status_old: [
        "recibido",
        "en_proceso",
        "listo",
        "entregado",
        "garantia",
        "cancelado",
        "fallido",
        "completado",
      ],
      user_role: ["superadmin", "admin", "tecnico"],
    },
  },
} as const

