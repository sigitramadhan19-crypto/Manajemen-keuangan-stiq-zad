// TypeScript type definitions matching the Supabase schema
// These types ensure type-safe queries throughout the application

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type StudentProgram = 'Reguler Asrama' | 'Non-Asrama' | 'Beasiswa'
export type StudentStatus = 'Aktif' | 'Cuti' | 'Lulus' | 'Keluar'
export type FeeCategory = 'Bulanan' | 'Tahunan' | 'Sekali Bayar'
export type BillStatus = 'belum bayar' | 'sebagian' | 'lunas'
export type PaymentMethod = 'Transfer BSI' | 'Tunai' | 'Virtual Account' | 'Transfer Mandiri'
export type PaymentStatus = 'pending' | 'verified' | 'rejected'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          nim: string
          name: string
          email: string | null
          whatsapp: string | null
          program: StudentProgram
          year: number
          status: StudentStatus
          fee_profile_id: string | null
          enrollment_date: string
          is_registered: boolean
          password: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nim: string
          name: string
          email: string | null
          whatsapp: string | null
          program: StudentProgram
          year: number
          status?: StudentStatus
          enrollment_date?: string
          is_registered?: boolean
          password?: string | null
          fee_profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nim?: string
          name?: string
          email?: string | null
          whatsapp?: string | null
          program?: StudentProgram
          year?: number
          status?: StudentStatus
          fee_profile_id?: string | null
          updated_at?: string
        }
          Relationships: any[]
      }
      fee_profiles: {
        Row: {
          id: string
          name: string
          category: FeeCategory
          amount: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: FeeCategory
          amount: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: FeeCategory
          amount?: number
          is_active?: boolean
          updated_at?: string
        }
          Relationships: any[]
      }
      bills: {
        Row: {
          id: string
          invoice_number: string
          student_id: string
          fee_profile_id: string
          period: string
          due_date: string
          amount: number
          status: BillStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          student_id: string
          fee_profile_id: string
          period: string
          due_date: string
          amount: number
          status?: BillStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          student_id?: string
          fee_profile_id?: string
          period?: string
          due_date?: string
          amount?: number
          status?: BillStatus
          updated_at?: string
        }
          Relationships: any[]
      }
      payments: {
        Row: {
          id: string
          transaction_number: string
          bill_id: string
          amount: number
          method: PaymentMethod
          proof_url: string | null
          status: PaymentStatus
          notes: string | null
          verified_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_number: string
          bill_id: string
          amount: number
          method: PaymentMethod
          proof_url?: string | null
          status?: PaymentStatus
          notes?: string | null
          verified_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_number?: string
          bill_id?: string
          amount?: number
          method?: PaymentMethod
          proof_url?: string | null
          status?: PaymentStatus
          notes?: string | null
          verified_by?: string | null
        }
          Relationships: any[]
      }
      audit_logs: {
        Row: {
          id: string
          action: AuditAction
          table_name: string
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          user_id: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          action: AuditAction
          table_name: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          action?: AuditAction
          table_name?: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          reason?: string | null
        }
          Relationships: any[]
      }
    }
  }
}

// Convenience types for use throughout the app
export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']

export type FeeProfile = Database['public']['Tables']['fee_profiles']['Row']
export type FeeProfileInsert = Database['public']['Tables']['fee_profiles']['Insert']
export type FeeProfileUpdate = Database['public']['Tables']['fee_profiles']['Update']

export type Bill = Database['public']['Tables']['bills']['Row']
export type BillInsert = Database['public']['Tables']['bills']['Insert']
export type BillUpdate = Database['public']['Tables']['bills']['Update']

export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

// Joined types for views that join tables
export type BillWithStudent = Bill & {
  students: Student
  fee_profiles: FeeProfile
}

export type PaymentWithBill = Payment & {
  bills: Bill & {
    students: Student
  }
}
