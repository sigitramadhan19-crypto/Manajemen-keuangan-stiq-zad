import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { supabase, formatRupiah, formatRupiahShort } from '../lib/api'
import * as XLSX from 'xlsx'

export const Route = createFileRoute('/_auth/laporan')({
  component: LaporanComponent,
})

interface MonthlyReport {
  period: string
  totalTagihan: number
  totalPemasukan: number
  sisaTunggakan: number
  lunasPercent: number
}

interface ProgramReport {
  program: string
  pemasukan: number
}

function LaporanComponent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPemasukan, setTotalPemasukan] = useState(0)
  const [totalTunggakan, setTotalTunggakan] = useState(0)
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])
  const [programReports, setProgramReports] = useState<ProgramReport[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('*, students!inner(name, nim, program), fee_profiles!inner(name, category)')
        .order('created_at', { ascending: false })

      if (billsError) throw billsError

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*, bills!inner(invoice_number)')
        .eq('status', 'verified')
        .order('created_at', { ascending: false })

      if (paymentsError) throw paymentsError

      const ringkasanData = monthlyReports.map(r => ({
        'Periode': r.period,
        'Total Tagihan (Rp)': r.totalTagihan,
        'Pemasukan (Rp)': r.totalPemasukan,
        'Sisa Tunggakan (Rp)': r.sisaTunggakan,
        'Persentase Lunas (%)': r.lunasPercent
      }))

      const tagihanData = (bills ?? []).map((b: any) => ({
        'No. Invoice': b.invoice_number,
        'Nama Mahasiswa': b.students?.name,
        'NIM': b.students?.nim,
        'Program Studi': b.students?.program,
        'Kategori Biaya': b.fee_profiles?.name,
        'Periode': b.period,
        'Jatuh Tempo': new Date(b.due_date).toLocaleDateString('id-ID'),
        'Nominal (Rp)': b.amount,
        'Status': b.status.toUpperCase()
      }))

      const pembayaranData = (payments ?? []).map((p: any) => ({
        'No. Transaksi': p.transaction_number,
        'Tanggal Bayar': new Date(p.created_at).toLocaleString('id-ID'),
        'No. Invoice': p.bills?.invoice_number,
        'Metode Bayar': p.method,
        'Nominal (Rp)': p.amount,
        'Catatan': p.notes || '-'
      }))

      const wb = XLSX.utils.book_new()
      
      const wsRingkasan = XLSX.utils.json_to_sheet(ringkasanData)
      XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan Bulanan')
      
      const wsTagihan = XLSX.utils.json_to_sheet(tagihanData)
      XLSX.utils.book_append_sheet(wb, wsTagihan, 'Daftar Tagihan')
      
      const wsPembayaran = XLSX.utils.json_to_sheet(pembayaranData)
      XLSX.utils.book_append_sheet(wb, wsPembayaran, 'Riwayat Pembayaran')

      const dateStr = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `Laporan_Keuangan_STIQ_${dateStr}.xlsx`)

    } catch (err: any) {
      alert('Gagal mengekspor data: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchReports() {
      setLoading(true)
      setError(null)
      try {
        // Get all bills with student info
        const { data: bills, error: billsError } = await supabase
          .from('bills')
          .select('*, students!inner(program)')

        if (billsError) throw billsError

        // Get all verified payments
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount, bill_id, status')
          .eq('status', 'verified')

        if (paymentsError) throw paymentsError

        if (cancelled) return

        // Build payment map: bill_id -> total paid
        const paymentsByBill = new Map<string, number>()
        for (const p of payments ?? []) {
          paymentsByBill.set(p.bill_id, (paymentsByBill.get(p.bill_id) ?? 0) + Number(p.amount))
        }

        // Calculate totals
        const allPemasukan = payments?.reduce((acc, p) => acc + Number(p.amount), 0) ?? 0
        const allTagihan = bills?.reduce((acc, b) => acc + Number(b.amount), 0) ?? 0
        setTotalPemasukan(allPemasukan)
        setTotalTunggakan(Math.max(0, allTagihan - allPemasukan))

        // Monthly breakdown
        const periodMap = new Map<string, { totalTagihan: number; totalPemasukan: number; billCount: number; lunasCount: number }>()
        for (const bill of bills ?? []) {
          const entry = periodMap.get(bill.period) ?? { totalTagihan: 0, totalPemasukan: 0, billCount: 0, lunasCount: 0 }
          entry.totalTagihan += Number(bill.amount)
          entry.totalPemasukan += paymentsByBill.get(bill.id) ?? 0
          entry.billCount += 1
          if (bill.status === 'lunas') entry.lunasCount += 1
          periodMap.set(bill.period, entry)
        }

        const reports: MonthlyReport[] = []
        for (const [period, data] of periodMap) {
          reports.push({
            period,
            totalTagihan: data.totalTagihan,
            totalPemasukan: data.totalPemasukan,
            sisaTunggakan: Math.max(0, data.totalTagihan - data.totalPemasukan),
            lunasPercent: data.billCount > 0 ? Math.round((data.lunasCount / data.billCount) * 100) : 0,
          })
        }
        reports.sort((a, b) => b.period.localeCompare(a.period))
        setMonthlyReports(reports)

        // Program breakdown
        const programMap = new Map<string, number>()
        for (const bill of bills ?? []) {
          const program = (bill as any).students?.program ?? 'Unknown'
          const paid = paymentsByBill.get(bill.id) ?? 0
          programMap.set(program, (programMap.get(program) ?? 0) + paid)
        }
        const progReports: ProgramReport[] = []
        for (const [program, pemasukan] of programMap) {
          progReports.push({ program, pemasukan })
        }
        progReports.sort((a, b) => b.pemasukan - a.pemasukan)
        setProgramReports(progReports)

      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal mengambil data laporan')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchReports()
    return () => { cancelled = true }
  }, [])

  const programColors = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-surface-variant border border-outline-variant']

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Laporan Keuangan</h2>
          <p className="font-body-sm text-body-sm text-secondary">Ringkasan pemasukan, tunggakan, dan rekapitulasi data keuangan.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          disabled={isExporting || loading}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant bg-surface hover:bg-surface-container text-on-surface rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm disabled:opacity-70"
        >
          {isExporting ? (
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined">download</span>
          )}
          {isExporting ? 'Mengekspor...' : 'Export Laporan Lengkap'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-error-container border border-error/30 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-error mt-0.5">error</span>
          <div>
            <div className="font-body-md text-body-md font-medium text-on-error-container">Gagal mengambil data</div>
            <div className="font-body-sm text-body-sm text-on-error-container/80 mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6">Pemasukan vs Tunggakan</h3>
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 bg-surface-container rounded animate-pulse" />
              <div className="h-10 bg-surface-container rounded animate-pulse" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between font-body-sm text-body-sm mb-1">
                  <span className="text-secondary">Pemasukan Diterima</span>
                  <span className="font-medium text-on-surface tabular-nums">Rp {formatRupiah(totalPemasukan)}</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalPemasukan + totalTunggakan > 0 ? Math.round((totalPemasukan / (totalPemasukan + totalTunggakan)) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-body-sm text-body-sm mb-1">
                  <span className="text-secondary">Tunggakan (Belum Dibayar)</span>
                  <span className="font-medium text-on-surface tabular-nums">Rp {formatRupiah(totalTunggakan)}</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2.5">
                  <div
                    className="bg-error h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalPemasukan + totalTunggakan > 0 ? Math.round((totalTunggakan / (totalPemasukan + totalTunggakan)) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6">Pemasukan per Program Studi</h3>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 bg-surface-container rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {programReports.map((pr, i) => (
                <div key={pr.program} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${programColors[i] ?? programColors[programColors.length - 1]}`} />
                    <span className="font-body-sm text-body-sm text-on-surface">{pr.program}</span>
                  </div>
                  <span className="font-financial-data text-financial-data font-medium tabular-nums text-on-surface">Rp {formatRupiah(pr.pemasukan)}</span>
                </div>
              ))}
              {programReports.length === 0 && (
                <div className="text-center font-body-sm text-body-sm text-secondary">Belum ada data pemasukan.</div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Monthly Recap Table */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-surface border-b border-outline-variant">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Rekapitulasi Bulanan</h3>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Bulan</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Total Tagihan</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Pemasukan</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Sisa Tunggakan</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-center">Persentase Lunas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-28" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-28 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-28 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-24 ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-4 bg-surface-container rounded w-20 mx-auto" /></td>
                  </tr>
                ))
              ) : monthlyReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline mb-2 block">assessment</span>
                    <div className="font-body-md text-body-md text-secondary">Belum ada data laporan.</div>
                  </td>
                </tr>
              ) : (
                monthlyReports.map(report => (
                  <tr key={report.period} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-4 py-3 font-body-md text-body-md font-medium text-on-surface">{report.period}</td>
                    <td className="px-4 py-3 font-financial-data text-financial-data text-secondary text-right tabular-nums">Rp {formatRupiah(report.totalTagihan)}</td>
                    <td className="px-4 py-3 font-financial-data text-financial-data text-primary font-medium text-right tabular-nums">Rp {formatRupiah(report.totalPemasukan)}</td>
                    <td className={`px-4 py-3 font-financial-data text-financial-data text-right tabular-nums ${report.sisaTunggakan > 0 ? 'text-error' : 'text-secondary'}`}>
                      Rp {formatRupiah(report.sisaTunggakan)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-surface-container rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${report.lunasPercent}%` }}
                          />
                        </div>
                        <span className={`font-body-sm text-body-sm font-medium ${report.lunasPercent === 100 ? 'text-primary' : ''}`}>
                          {report.lunasPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
