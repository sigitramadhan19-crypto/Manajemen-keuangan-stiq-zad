import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useContext } from 'react'
import { StudentContext } from './student'
import { getBills, formatRupiah } from '../lib/api'
import type { Student } from '../lib/database.types'

export const Route = createFileRoute('/student/')({
  component: StudentDashboard,
})

function StudentDashboard() {
  const { student } = useContext(StudentContext)
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchDashboardData = async () => {
      try {
        const { data } = await getBills({ studentId: student.id })
        if (!cancelled) {
          setBills(data)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching student dashboard data:', err)
        if (!cancelled) setLoading(false)
      }
    }

    fetchDashboardData()
    return () => { cancelled = true }
  }, [student.id])

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-24 bg-surface-container rounded-2xl"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-surface-container rounded-xl"></div>
          <div className="h-20 bg-surface-container rounded-xl"></div>
        </div>
      </div>
    )
  }

  const unpaidBills = bills.filter(b => b.status !== 'lunas')
  const totalTunggakan = unpaidBills.reduce((sum, b) => sum + b.amount, 0)
  
  const paidBills = bills.filter(b => b.status === 'lunas')
  const totalDibayar = paidBills.reduce((sum, b) => sum + b.amount, 0)

  // 3 tagihan terakhir
  const recentUnpaid = unpaidBills.slice(0, 3)

  return (
    <div className="p-4 space-y-6">
      
      {/* Student Card */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-6 text-on-primary shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <div className="font-body-sm text-on-primary/80 mb-1">Status Keaktifan</div>
          <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full font-body-sm font-bold text-white mb-4">
            {student.status}
          </div>
          
          <div className="font-display-sm font-bold">{student.name}</div>
          <div className="font-body-md text-on-primary/90">{student.nim} • {student.program}</div>
        </div>
      </div>

      {/* Keuangan Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-error/10 rounded-2xl p-4 border border-error/20">
          <div className="flex items-center gap-2 mb-2 text-error">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span className="font-body-xs font-bold uppercase tracking-wider">Tunggakan</span>
          </div>
          <div className="font-headline-sm font-bold text-error break-words">
            Rp {formatRupiah(totalTunggakan)}
          </div>
          <div className="font-body-xs text-error/80 mt-1">{unpaidBills.length} Tagihan Aktif</div>
        </div>
        
        <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-body-xs font-bold uppercase tracking-wider">Sudah Dibayar</span>
          </div>
          <div className="font-headline-sm font-bold text-primary break-words">
            Rp {formatRupiah(totalDibayar)}
          </div>
          <div className="font-body-xs text-primary/80 mt-1">{paidBills.length} Tagihan Lunas</div>
        </div>
      </div>

      {/* Tagihan Berjalan */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-sm font-bold text-on-surface">Tagihan Mendesak</h3>
        </div>
        
        {recentUnpaid.length === 0 ? (
          <div className="bg-surface-container rounded-2xl p-6 text-center border border-outline-variant">
            <span className="material-symbols-outlined text-[40px] text-primary mb-2">task_alt</span>
            <div className="font-body-md font-bold text-on-surface">Alhamdulillah!</div>
            <div className="font-body-sm text-secondary">Tidak ada tagihan yang tertunggak.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentUnpaid.map(bill => (
              <div key={bill.id} className="bg-surface rounded-2xl p-4 border border-outline-variant shadow-sm flex justify-between items-center">
                <div>
                  <div className="font-body-md font-bold text-on-surface">{bill.fee_profiles.name}</div>
                  <div className="font-body-sm text-secondary">{bill.period}</div>
                  <div className={`mt-1 font-body-xs px-2 py-0.5 rounded-md inline-block font-medium ${bill.status === 'sebagian' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-on-error-container'}`}>
                    {bill.status === 'sebagian' ? 'Dibayar Sebagian' : 'Belum Bayar'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-headline-sm font-bold text-error">Rp {formatRupiah(bill.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
