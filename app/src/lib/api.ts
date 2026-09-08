import { createClient } from '@supabase/supabase-js'
import type {
  Database,
  Student, StudentInsert, StudentUpdate,
  FeeProfile, FeeProfileInsert, FeeProfileUpdate,
  BillStatus, BillWithStudent, BillInsert,
  PaymentWithBill, PaymentInsert,
  StudentProgram, StudentStatus,
  PaymentStatus,
} from './database.types'

// ============================================
// Supabase Client
// ============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

// ============================================
// Helper: Format Rupiah
// ============================================

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount)
}

export function formatRupiahShort(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`
  return `Rp ${amount}`
}

// ============================================
// Period Utilities
// ============================================

export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function generateStandardPeriods(startYear: number, endYear: number): string[] {
  const periods: string[] = []
  for (let year = startYear; year <= endYear; year++) {
    for (let month of MONTHS) {
      periods.push(`${month} ${year}`)
    }
  }
  return periods
}

export function sortPeriodsDesc(periods: string[]): string[] {
  return periods.sort((a, b) => {
    const [monthA, yearA] = a.split(' ')
    const [monthB, yearB] = b.split(' ')
    
    const indexA = MONTHS.indexOf(monthA)
    const indexB = MONTHS.indexOf(monthB)

    const isAValid = indexA !== -1 && !isNaN(parseInt(yearA))
    const isBValid = indexB !== -1 && !isNaN(parseInt(yearB))

    // Both are standard format "Bulan Tahun"
    if (isAValid && isBValid) {
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA)
      return indexB - indexA
    }
    
    // Standard formats always come before non-standard formats
    if (isAValid && !isBValid) return -1
    if (!isAValid && isBValid) return 1
    
    // If both are non-standard, sort alphabetically descending
    return b.localeCompare(a)
  })
}

// ============================================
// Students API
// ============================================

export interface StudentFilters {
  search?: string
  program?: StudentProgram | ''
  status?: StudentStatus | ''
  page?: number
  pageSize?: number
}

export async function getStudents(filters: StudentFilters = {}) {
  const { search, program, status, page = 1, pageSize = 10 } = filters

  let query = supabase
    .from('students')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })

  if (search) {
    query = query.or(`name.ilike.%${search}%,nim.ilike.%${search}%`)
  }
  if (program) {
    query = query.eq('program', program)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error
  return { data: data as Student[], count: count ?? 0 }
}

export async function getStudentById(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Student
}

export async function createStudent(student: StudentInsert) {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single()

  if (error) throw error
  return data as Student
}

export async function createStudentsBulk(students: StudentInsert[]) {
  const { data, error } = await supabase
    .from('students')
    .insert(students)
    .select()

  if (error) throw error
  return data as Student[]
}

export async function updateStudent(id: string, updates: StudentUpdate) {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Student
}

export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// Fee Profiles API
// ============================================

export async function getFeeProfiles() {
  const { data, error } = await supabase
    .from('fee_profiles')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data as FeeProfile[]
}

export async function createFeeProfile(profile: FeeProfileInsert) {
  const { data, error } = await supabase
    .from('fee_profiles')
    .insert(profile)
    .select()
    .single()

  if (error) throw error
  return data as FeeProfile
}

export async function updateFeeProfile(id: string, updates: FeeProfileUpdate) {
  const { data, error } = await supabase
    .from('fee_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FeeProfile
}

export async function deleteFeeProfile(id: string) {
  const { error } = await supabase
    .from('fee_profiles')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// Bills API
// ============================================

export interface BillFilters {
  search?: string
  period?: string
  program?: StudentProgram | ''
  status?: BillStatus | ''
  year?: number
  studentId?: string
  page?: number
  pageSize?: number
}

export async function getBills(filters: BillFilters = {}) {
  const { search, period, program, status, page = 1, pageSize = 10 } = filters

  let query = supabase
    .from('bills')
    .select('*, students!inner(*), fee_profiles!inner(*), payments(amount, status)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`students.name.ilike.%${search}%,students.nim.ilike.%${search}%`, { referencedTable: 'students' })
  }
  if (period) {
    query = query.eq('period', period)
  }
  if (program) {
    query = query.eq('students.program', program)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (filters.studentId) {
    query = query.eq('student_id', filters.studentId)
  }
  if (filters.year) {
    query = query.eq('students.year', filters.year)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error
  return { data: data as unknown as BillWithStudent[], count: count ?? 0 }
}

export async function createBill(bill: BillInsert) {
  const { data, error } = await supabase
    .from('bills')
    .insert(bill)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createBillsBulk(bills: BillInsert[]) {
  const { data, error } = await supabase
    .from('bills')
    .insert(bills)
    .select()

  if (error) throw error
  return data
}

export async function deleteBill(id: string) {
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// Payments API
// ============================================

export interface PaymentFilters {
  search?: string
  date?: string
  status?: PaymentStatus | ''
  page?: number
  pageSize?: number
}

export async function getPayments(filters: PaymentFilters = {}) {
  const { search, date, status, page = 1, pageSize = 10 } = filters

  let query = supabase
    .from('payments')
    .select('*, bills!inner(*, students!inner(*))', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`transaction_number.ilike.%${search}%`)
  }
  if (date) {
    query = query.gte('created_at', `${date}T00:00:00`)
    query = query.lte('created_at', `${date}T23:59:59`)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error
  return { data: data as unknown as PaymentWithBill[], count: count ?? 0 }
}

export async function createPayment(payment: PaymentInsert) {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePaymentStatus(id: string, status: PaymentStatus) {
  const { data, error } = await supabase
    .from('payments')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// Dashboard Stats API
// ============================================

export interface DashboardStats {
  totalPemasukan: number
  totalTunggakan: number
  mahasiswaAktif: number
  totalMahasiswa: number
  tunggakanCount: number
  lunasPercentage: number
}

export async function getDashboardStats(period: string = 'Agustus 2026'): Promise<DashboardStats> {
  // Get all bills for the period
  const { data: bills, error: billsError } = await supabase
    .from('bills')
    .select('amount, status')
    .eq('period', period)

  if (billsError) throw billsError

  // Get verified payments for the period's bills
  const { data: periodBills } = await supabase
    .from('bills')
    .select('id')
    .eq('period', period)

  const billIds = periodBills?.map(b => b.id) ?? []

  let totalPemasukan = 0
  if (billIds.length > 0) {
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .in('bill_id', billIds)
      .eq('status', 'verified')

    if (paymentsError) throw paymentsError
    totalPemasukan = payments?.reduce((acc, p) => acc + Number(p.amount), 0) ?? 0
  }

  // Calculate stats
  const totalTagihan = bills?.reduce((acc, b) => acc + Number(b.amount), 0) ?? 0
  const totalTunggakan = totalTagihan - totalPemasukan
  const tunggakanBills = bills?.filter(b => b.status !== 'lunas') ?? []

  // Get active students count
  const { count: mahasiswaAktif, error: studentsError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Aktif')

  if (studentsError) throw studentsError

  const { count: totalMahasiswa, error: totalError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  if (totalError) throw totalError

  const lunasBills = bills?.filter(b => b.status === 'lunas') ?? []
  const lunasPercentage = bills && bills.length > 0
    ? Math.round((lunasBills.length / bills.length) * 100)
    : 0

  return {
    totalPemasukan,
    totalTunggakan: Math.max(0, totalTunggakan),
    mahasiswaAktif: mahasiswaAktif ?? 0,
    totalMahasiswa: totalMahasiswa ?? 0,
    tunggakanCount: tunggakanBills.length,
    lunasPercentage,
  }
}

// ============================================
// Available Periods (for dropdowns)
// ============================================

export async function getAvailablePeriods(): Promise<string[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('period')

  if (error) throw error

  const periods = [...new Set(data?.map(b => b.period) ?? [])]
  return sortPeriodsDesc(periods)
}

export async function getStudentPayments(studentId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id,
      transaction_number,
      amount,
      method,
      status,
      created_at,
      bills!inner (
        id,
        student_id,
        period,
        fee_profiles (name)
      )
    `)
    .eq('bills.student_id', studentId)
    .order('created_at', { ascending: false })
    
  if (error) {
    console.error('Error fetching student payments:', error)
    throw error
  }
  
  return { data, error: null }
}

// ============================================
// Student Self-Payment
// ============================================

export async function uploadPaymentProof(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
  const filePath = `receipts/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('payment_proofs')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Error uploading proof:', uploadError)
    throw uploadError
  }

  const { data } = supabase.storage
    .from('payment_proofs')
    .getPublicUrl(filePath)

  return data.publicUrl
}

export async function submitPayment(payload: {
  bill_id: string
  amount: number
  method: string
  proof_url: string
}) {
  const transaction_number = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  
  const { data, error } = await supabase
    .from('payments')
    .insert({
      transaction_number,
      bill_id: payload.bill_id,
      amount: payload.amount,
      method: payload.method,
      proof_url: payload.proof_url,
      status: 'pending' // automatically pending until verified
    })
    .select()

  if (error) {
    console.error('Error submitting payment:', error)
    throw error
  }

  return { data, error: null }
}

// ============================================
// Admin Verification
// ============================================

export async function getPendingPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id,
      transaction_number,
      amount,
      method,
      proof_url,
      status,
      created_at,
      bills!inner (
        id,
        period,
        fee_profiles (name),
        students (name, nim)
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching pending payments:', error)
    throw error
  }

  return { data, error: null }
}

export async function verifyPayment(paymentId: string, status: 'verified' | 'rejected') {
  const { data, error } = await supabase
    .from('payments')
    .update({ status })
    .eq('id', paymentId)
    .select()

  if (error) {
    console.error('Error verifying payment:', error)
    throw error
  }

  return { data, error: null }
}
