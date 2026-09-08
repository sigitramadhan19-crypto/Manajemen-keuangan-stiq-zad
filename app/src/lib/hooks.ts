import { useState, useEffect, useCallback } from 'react'
import {
  getStudents, type StudentFilters,
  getFeeProfiles,
  getBills, type BillFilters,
  getPayments, type PaymentFilters,
  getDashboardStats, type DashboardStats,
  getAvailablePeriods,
} from './api'
import type { Student, FeeProfile, BillWithStudent, PaymentWithBill } from './database.types'

// ============================================
// Generic async data hook
// ============================================

interface UseAsyncDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchFlag, setRefetchFlag] = useState(0)

  const refetch = useCallback(() => setRefetchFlag(f => f + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetcher()
      .then(result => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchFlag, ...deps])

  return { data, loading, error, refetch }
}

// ============================================
// Students Hook
// ============================================

interface UseStudentsResult {
  students: Student[]
  totalCount: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useStudents(filters: StudentFilters = {}): UseStudentsResult {
  const { search, program, status, page, pageSize } = filters
  const result = useAsyncData(
    () => getStudents(filters),
    [search, program, status, page, pageSize]
  )

  return {
    students: result.data?.data ?? [],
    totalCount: result.data?.count ?? 0,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

// ============================================
// Fee Profiles Hook
// ============================================

interface UseFeeProfilesResult {
  feeProfiles: FeeProfile[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFeeProfiles(): UseFeeProfilesResult {
  const result = useAsyncData(() => getFeeProfiles())

  return {
    feeProfiles: result.data ?? [],
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

// ============================================
// Bills Hook
// ============================================

interface UseBillsResult {
  bills: BillWithStudent[]
  totalCount: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useBills(filters: BillFilters = {}): UseBillsResult {
  const { search, period, program, status, year, page, pageSize } = filters
  const result = useAsyncData(
    () => getBills(filters),
    [search, period, program, status, year, page, pageSize]
  )

  return {
    bills: result.data?.data ?? [],
    totalCount: result.data?.count ?? 0,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

// ============================================
// Payments Hook
// ============================================

interface UsePaymentsResult {
  payments: PaymentWithBill[]
  totalCount: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePayments(filters: PaymentFilters = {}): UsePaymentsResult {
  const { search, date, status, page, pageSize } = filters
  const result = useAsyncData(
    () => getPayments(filters),
    [search, date, status, page, pageSize]
  )

  return {
    payments: result.data?.data ?? [],
    totalCount: result.data?.count ?? 0,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

// ============================================
// Dashboard Stats Hook
// ============================================

interface UseDashboardStatsResult {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboardStats(period: string = 'Agustus 2026'): UseDashboardStatsResult {
  const result = useAsyncData(
    () => getDashboardStats(period),
    [period]
  )

  return {
    stats: result.data,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

// ============================================
// Available Periods Hook
// ============================================

export function useAvailablePeriods() {
  const result = useAsyncData(() => getAvailablePeriods())
  return {
    periods: result.data ?? [],
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  }
}

// ============================================
// Debounce Hook (for search inputs)
// ============================================

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
