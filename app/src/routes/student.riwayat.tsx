import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useContext } from 'react'
import { StudentContext } from './student'
import { supabase } from '../lib/api'
import { formatRupiah } from '../lib/api'

export const Route = createFileRoute('/student/riwayat')({
  component: StudentRiwayat,
})

function StudentRiwayat() {
  const { student } = useContext(StudentContext)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchHistory = async () => {
      try {
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
              period,
              fee_profiles (name)
            )
          `)
          .eq('bills.student_id', student?.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        
        if (!cancelled) {
          setPayments(data || [])
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching history:', err)
        if (!cancelled) setLoading(false)
      }
    }

    if (student?.id) {
      fetchHistory()
    }
    
    return () => { cancelled = true }
  }, [student?.id])

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-surface-container rounded-lg w-1/3 mb-6"></div>
        <div className="h-24 bg-surface-container rounded-2xl"></div>
        <div className="h-24 bg-surface-container rounded-2xl"></div>
        <div className="h-24 bg-surface-container rounded-2xl"></div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-primary/10 text-primary'
      case 'pending': return 'bg-tertiary/10 text-tertiary'
      case 'rejected': return 'bg-error/10 text-error'
      default: return 'bg-surface-container text-on-surface'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return 'check_circle'
      case 'pending': return 'schedule'
      case 'rejected': return 'cancel'
      default: return 'help'
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return 'Berhasil'
      case 'pending': return 'Menunggu'
      case 'rejected': return 'Ditolak'
      default: return status
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-6 px-2">
        <div>
          <h2 className="font-display-sm font-bold text-on-surface">Riwayat</h2>
          <p className="font-body-sm text-secondary">Semua transaksi yang Anda lakukan</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="bg-surface-container rounded-3xl p-8 text-center border border-outline-variant mt-8">
          <span className="material-symbols-outlined text-[48px] text-secondary/50 mb-4">history</span>
          <div className="font-headline-sm font-bold text-on-surface mb-2">Belum ada transaksi</div>
          <p className="font-body-sm text-secondary">Anda belum pernah melakukan pembayaran apapun.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map(payment => {
            const billName = payment.bills?.fee_profiles?.name || 'Tagihan'
            const period = payment.bills?.period || ''
            
            return (
              <div key={payment.id} className="bg-surface rounded-2xl p-4 border border-outline-variant shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(payment.status)}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {getStatusIcon(payment.status)}
                      </span>
                    </div>
                    <div>
                      <div className="font-body-md font-bold text-on-surface leading-tight">{billName}</div>
                      <div className="font-body-xs text-secondary mt-0.5">{period}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-headline-sm font-bold text-on-surface">
                      Rp {formatRupiah(payment.amount)}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-outline-variant/50">
                  <div className="font-body-xs text-secondary">
                    {new Date(payment.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-body-xs font-medium px-2 py-0.5 bg-surface-container rounded text-secondary">
                      {payment.method}
                    </div>
                    <div className={`font-body-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getStatusColor(payment.status)}`}>
                      {getStatusText(payment.status)}
                    </div>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
