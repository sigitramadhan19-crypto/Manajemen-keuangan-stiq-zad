import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { useDashboardStats, useBills, useAvailablePeriods, useDebounce } from '../lib/hooks'
import { formatRupiah, formatRupiahShort, supabase } from '../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import type { BillStatus } from '../lib/database.types'
import type { StudentProgram } from '../lib/database.types'

export const Route = createFileRoute('/_auth/')(
  {
    component: DashboardComponent,
  }
)

function DashboardComponent() {
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)

  // Filter states
  const [searchInput, setSearchInput] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('Agustus 2026')
  const [selectedProgram, setSelectedProgram] = useState<StudentProgram | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<BillStatus | ''>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(searchInput, 400)

  // Reset page when filters change
  const filters = useMemo(() => ({
    search: debouncedSearch,
    period: selectedPeriod,
    program: selectedProgram,
    status: selectedStatus,
    year: selectedYear ? parseInt(selectedYear) : undefined,
    page: currentPage,
    pageSize,
  }), [debouncedSearch, selectedPeriod, selectedProgram, selectedStatus, selectedYear, currentPage, pageSize])

  // Data fetching
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats(selectedPeriod)
  const { bills, totalCount, loading: billsLoading, error: billsError } = useBills(filters)
  const { periods } = useAvailablePeriods()

  const totalPages = Math.ceil(totalCount / pageSize)
  const isLoading = statsLoading || billsLoading
  const error = statsError || billsError

  const openDrawer = (billId: string) => {
    setSelectedBillId(billId)
    setDrawerOpen(true)
  }
  const closeDrawer = () => {
    setDrawerOpen(false)
    setSelectedBillId(null)
  }

  // Find the selected bill for the drawer
  const selectedBill = bills.find(b => b.id === selectedBillId)

  // Chart Data State
  const [trendData, setTrendData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [chartsLoading, setChartsLoading] = useState(true)

  React.useEffect(() => {
    let cancelled = false
    async function fetchCharts() {
      setChartsLoading(true)
      try {
        const { data: allBills } = await supabase.from('bills').select('id, amount, status, period')
        const { data: allPayments } = await supabase.from('payments').select('bill_id, amount').eq('status', 'verified')
        
        if (!allBills || cancelled) return

        // 1. Status Tagihan
        let lunas = 0, sebagian = 0, belum = 0
        allBills.forEach(b => {
          if (b.status === 'lunas') lunas++
          else if (b.status === 'sebagian') sebagian++
          else belum++
        })
        setStatusData([
          { name: 'Lunas', value: lunas, color: '#16a34a' },
          { name: 'Sebagian', value: sebagian, color: '#ca8a04' },
          { name: 'Belum Bayar', value: belum, color: '#ef4444' },
        ])

        // 2. Trend Pemasukan vs Tunggakan
        const paymentsByBill = new Map()
        allPayments?.forEach(p => {
          paymentsByBill.set(p.bill_id, (paymentsByBill.get(p.bill_id) || 0) + Number(p.amount))
        })

        const periodMap = new Map()
        allBills.forEach(b => {
          const entry = periodMap.get(b.period) || { Pemasukan: 0, Tunggakan: 0 }
          const paid = paymentsByBill.get(b.id) || 0
          const tunggakan = Math.max(0, Number(b.amount) - paid)
          entry.Pemasukan += paid
          entry.Tunggakan += tunggakan
          periodMap.set(b.period, entry)
        })

        const trend = Array.from(periodMap.entries()).map(([period, data]) => ({
          period,
          Pemasukan: data.Pemasukan,
          Tunggakan: data.Tunggakan
        }))
        // Note: Simple alphabetical sort might not be chronological depending on naming,
        // but for now we just show it. Or better, we can just reverse to show latest.
        trend.sort((a, b) => a.period.localeCompare(b.period))
        setTrendData(trend)

      } catch (err) {
        console.error("Error fetching charts", err)
      } finally {
        if (!cancelled) setChartsLoading(false)
      }
    }
    fetchCharts()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-error-container border border-error/30 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-error mt-0.5">error</span>
          <div>
            <div className="font-body-md text-body-md font-medium text-on-error-container">Gagal mengambil data</div>
            <div className="font-body-sm text-body-sm text-on-error-container/80 mt-1">{error}</div>
            <div className="font-body-sm text-body-sm text-on-error-container/60 mt-1">Pastikan SQL schema sudah dijalankan di Supabase SQL Editor.</div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-margin-section">
        {/* Card 1: Total Pemasukan */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-body-md text-body-md text-secondary">Total Pemasukan (Bulan Ini)</span>
            <div className="w-8 h-8 rounded-full bg-primary-container/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
          </div>
          <div>
            {statsLoading ? (
              <div className="h-14 bg-surface-container rounded-lg animate-pulse" />
            ) : (
              <>
                <div className="font-headline-md text-headline-md font-bold text-on-surface tabular-nums truncate">
                  {stats ? `Rp ${formatRupiah(stats.totalPemasukan)}` : '-'}
                </div>
                <div className="font-body-sm text-body-sm text-primary flex items-center mt-1">
                  <span className="material-symbols-outlined text-[14px] mr-1">arrow_upward</span>
                  {stats ? `${stats.lunasPercentage}% lunas` : '-'}
                </div>
              </>
            )}
          </div>
        </div>
        {/* Card 2: Total Tunggakan */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-body-md text-body-md text-secondary">Total Tunggakan</span>
            <div className="w-8 h-8 rounded-full bg-error-container/50 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </div>
          </div>
          <div>
            {statsLoading ? (
              <div className="h-14 bg-surface-container rounded-lg animate-pulse" />
            ) : (
              <>
                <div className="font-headline-md text-headline-md font-bold text-error tabular-nums truncate">
                  {stats ? `Rp ${formatRupiah(stats.totalTunggakan)}` : '-'}
                </div>
                <div className="font-body-sm text-body-sm text-secondary flex items-center mt-1">
                  Dari {stats?.tunggakanCount ?? 0} Tagihan
                </div>
              </>
            )}
          </div>
        </div>
        {/* Card 3: Mahasiswa Aktif */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-body-md text-body-md text-secondary">Mahasiswa Aktif</span>
            <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">school</span>
            </div>
          </div>
          <div>
            {statsLoading ? (
              <div className="h-14 bg-surface-container rounded-lg animate-pulse" />
            ) : (
              <>
                <div className="font-headline-md text-headline-md font-bold text-on-surface tabular-nums">
                  {stats?.mahasiswaAktif ?? 0}
                </div>
                <div className="font-body-sm text-body-sm text-secondary flex items-center mt-1">
                  {stats ? `${stats.lunasPercentage}% Lunas SPP` : '-'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6">Tren Pemasukan vs Tunggakan</h3>
          {chartsLoading ? (
            <div className="h-[300px] bg-surface-container rounded-lg animate-pulse" />
          ) : trendData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-secondary">Belum ada data</div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}Jt`} 
                    tick={{ fill: '#6b7280', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatRupiah(value)}
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Pemasukan" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="Tunggakan" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6">Status Tagihan Keseluruhan</h3>
          {chartsLoading ? (
            <div className="h-[300px] bg-surface-container rounded-lg animate-pulse" />
          ) : statusData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-secondary">Belum ada data</div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value} Tagihan`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>


      {/* Monitoring Table */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Monitoring SPP & Tagihan - {selectedPeriod}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-surface flex flex-wrap gap-3 border-b border-outline-variant items-center">
          <div className="relative flex-grow max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
            <input
              className="w-full pl-9 pr-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container-lowest"
              placeholder="Cari Nama atau NIM..."
              type="text"
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setCurrentPage(1) }}
            />
          </div>
          <select
            className="px-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedPeriod}
            onChange={e => { setSelectedPeriod(e.target.value); setCurrentPage(1) }}
          >
            {periods.length > 0 ? (
              periods.map(p => <option key={p} value={p}>{`Bulan: ${p}`}</option>)
            ) : (
              <option value="Agustus 2026">Bulan: Agustus 2026</option>
            )}
          </select>
          <select
            className="px-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedProgram}
            onChange={e => { setSelectedProgram(e.target.value as StudentProgram | ''); setCurrentPage(1) }}
          >
            <option value="">Semua Program</option>
            <option value="Reguler Asrama">Reguler Asrama</option>
            <option value="Non-Asrama">Non-Asrama</option>
            <option value="Beasiswa">Beasiswa</option>
          </select>
          <select
            className="px-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedYear}
            onChange={e => { setSelectedYear(e.target.value); setCurrentPage(1) }}
          >
            <option value="">Semua Angkatan</option>
            <option value="2023">Angkatan 2023</option>
            <option value="2024">Angkatan 2024</option>
            <option value="2025">Angkatan 2025</option>
            <option value="2026">Angkatan 2026</option>
            <option value="2027">Angkatan 2027</option>
          </select>
          <select
            className="px-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value as BillStatus | ''); setCurrentPage(1) }}
          >
            <option value="">Semua Status</option>
            <option value="lunas">Lunas</option>
            <option value="belum bayar">Belum Bayar</option>
            <option value="sebagian">Sebagian</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">NIM & Nama</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Program</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Jenis Tagihan</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Nominal (Rp)</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {billsLoading ? (
                // Loading skeleton rows
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-32" /><div className="h-3 bg-surface-container rounded w-20 mt-1" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-24" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-20 ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-5 bg-surface-container rounded-full w-16 mx-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline mb-2 block">search_off</span>
                    <div className="font-body-md text-body-md text-secondary">
                      {debouncedSearch || selectedProgram || selectedStatus
                        ? 'Tidak ada tagihan yang cocok dengan filter.'
                        : 'Belum ada data tagihan untuk periode ini.'}
                    </div>
                  </td>
                </tr>
              ) : (
                bills.map(bill => (
                  <tr
                    key={bill.id}
                    className="hover:bg-surface-container-lowest transition-colors group cursor-pointer"
                    onClick={() => openDrawer(bill.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-body-md text-body-md font-medium text-on-surface">{bill.students.name}</div>
                      <div className="font-financial-data text-financial-data text-secondary text-xs">{bill.students.nim}</div>
                    </td>
                    <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface">{bill.students.program}</td>
                    <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface">{bill.fee_profiles.name}</td>
                    <td className="px-4 py-3 font-financial-data text-financial-data text-on-surface text-right tabular-nums">
                      {formatRupiah(bill.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={bill.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-primary hover:text-surface-tint font-body-sm text-body-sm font-medium">
                        {bill.status === 'lunas' ? 'Detail' : 'Bayar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-outline-variant bg-surface flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-secondary">
            {billsLoading ? '...' : `Menampilkan ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, totalCount)} dari ${totalCount}`}
          </span>
          <div className="flex gap-1">
            <button
              className="p-1 rounded hover:bg-surface-container text-secondary disabled:opacity-50"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  className={`px-2 py-1 rounded font-body-sm text-body-sm ${
                    pageNum === currentPage
                      ? 'bg-primary text-on-primary'
                      : 'hover:bg-surface-container text-secondary'
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              className="p-1 rounded hover:bg-surface-container text-secondary disabled:opacity-50"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* Payment Drawer */}
      <div
        className={`drawer-overlay fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex justify-end ${drawerOpen ? 'active' : ''}`}
        id="paymentDrawerOverlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDrawer()
        }}
      >
        <div
          className={`drawer-panel w-full max-w-md bg-surface-container-lowest h-full shadow-xl flex flex-col border-l border-outline-variant ${drawerOpen ? 'active' : ''}`}
          id="paymentDrawerPanel"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface sticky top-0">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Detail Tagihan</h3>
            <button className="p-1 text-secondary hover:text-on-surface rounded-full hover:bg-surface-container transition-colors" onClick={closeDrawer}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedBill ? (
              <>
                {/* Student Info */}
                <div className="bg-surface-container rounded-lg p-4 flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 font-headline-sm">
                    {selectedBill.students.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">{selectedBill.students.name}</div>
                    <div className="font-body-sm text-body-sm text-secondary">NIM: {selectedBill.students.nim} • {selectedBill.students.program}</div>
                  </div>
                </div>

                {/* Bill Info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-body-sm text-body-sm text-secondary">No. Invoice</span>
                    <span className="font-financial-data text-financial-data text-on-surface">{selectedBill.invoice_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body-sm text-body-sm text-secondary">Jenis</span>
                    <span className="font-body-md text-body-md text-on-surface">{selectedBill.fee_profiles.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body-sm text-body-sm text-secondary">Periode</span>
                    <span className="font-body-md text-body-md text-on-surface">{selectedBill.period}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body-sm text-body-sm text-secondary">Jatuh Tempo</span>
                    <span className="font-body-md text-body-md text-on-surface">
                      {new Date(selectedBill.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <hr className="border-outline-variant" />
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md font-medium text-on-surface">Nominal</span>
                    <span className="font-financial-data text-financial-data font-bold text-on-surface tabular-nums text-lg">Rp {formatRupiah(selectedBill.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body-sm text-body-sm text-secondary">Status</span>
                    <StatusBadge status={selectedBill.status} />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-secondary py-12">
                <span className="material-symbols-outlined text-[48px] text-outline mb-2 block">receipt_long</span>
                <p className="font-body-md text-body-md">Pilih tagihan untuk melihat detail</p>
              </div>
            )}
          </div>
          {selectedBill && selectedBill.status !== 'lunas' && (
            <div className="p-4 border-t border-outline-variant bg-surface sticky bottom-0 flex gap-3">
              <button className="flex-1 py-2 px-4 border border-outline-variant rounded-lg font-body-md text-body-md font-medium text-secondary hover:bg-surface-container transition-colors" onClick={closeDrawer}>Tutup</button>
              <button className="flex-1 py-2 px-4 bg-primary hover:bg-surface-tint rounded-lg font-body-md text-body-md font-medium text-on-primary transition-colors" onClick={closeDrawer}>Record Pembayaran</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ============================================
// Status Badge Component
// ============================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    'lunas': { bg: 'bg-primary-container', text: 'text-on-primary-container', label: 'Lunas' },
    'belum bayar': { bg: 'bg-error-container', text: 'text-on-error-container', label: 'Belum Bayar' },
    'sebagian': { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed', label: 'Sebagian' },
  }
  const c = config[status] ?? { bg: 'bg-surface-container-highest', text: 'text-on-surface', label: status }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}
