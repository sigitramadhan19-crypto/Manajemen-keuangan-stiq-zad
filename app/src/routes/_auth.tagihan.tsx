import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useMemo, useEffect } from 'react'
import { useBills, useAvailablePeriods, useFeeProfiles, useStudents, useDebounce } from '../lib/hooks'
import { formatRupiah, formatRupiahShort, createBill, createBillsBulk, generateStandardPeriods, sortPeriodsDesc, deleteBill } from '../lib/api'
import type { BillStatus, StudentProgram, BillInsert, Student } from '../lib/database.types'

export const Route = createFileRoute('/_auth/tagihan')({
  component: TagihanComponent,
})

function TagihanComponent() {
  const [searchInput, setSearchInput] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<BillStatus | ''>('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const debouncedSearch = useDebounce(searchInput, 400)
  const { periods, refetch: refetchPeriods } = useAvailablePeriods()

  const { bills, totalCount, loading, error, refetch } = useBills({
    search: debouncedSearch,
    period: selectedPeriod,
    status: selectedStatus,
    page: currentPage,
    pageSize,
  })

  // We no longer auto-set selectedPeriod to periods[0] because we have "Semua Periode"
  // useEffect(() => {
  //   if (periods.length > 0 && !periods.includes(selectedPeriod)) {
  //     setSelectedPeriod(periods[0])
  //   }
  // }, [periods])

  // Modals
  const [isIndividualOpen, setIsIndividualOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [billToDelete, setBillToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const confirmDelete = async () => {
    if (!billToDelete) return
    setIsDeleting(true)
    try {
      await deleteBill(billToDelete)
      setBillToDelete(null)
      refetch()
      refetchPeriods()
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tagihan.')
    } finally {
      setIsDeleting(false)
    }
  }


  // Summary stats from bills data
  const summary = useMemo(() => {
    const totalTagihan = bills.reduce((acc, b) => acc + b.amount, 0)
    const lunasCount = bills.filter(b => b.status === 'lunas').length
    const tunggakanAmount = bills.filter(b => b.status !== 'lunas').reduce((acc, b) => acc + b.amount, 0)
    const nearDue = bills.filter(b => {
      const due = new Date(b.due_date)
      const now = new Date()
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysLeft <= 7 && b.status !== 'lunas'
    }).length
    return { totalTagihan, lunasCount, tunggakanAmount, nearDue, lunasPercent: totalCount > 0 ? Math.round((lunasCount / bills.length) * 100) : 0 }
  }, [bills, totalCount])

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Manajemen Tagihan</h2>
          <p className="font-body-sm text-body-sm text-secondary">Generate tagihan baru dan pantau status tagihan per periode.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsIndividualOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-outline-variant bg-surface hover:bg-surface-container text-on-surface rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Tagihan Individu
          </button>
          <button onClick={() => setIsBulkOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-surface-tint text-on-primary rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">library_add</span>
            Generate Kolektif
          </button>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="font-body-sm text-body-sm text-secondary mb-1">Total Tagihan ({selectedPeriod})</div>
          <div className="font-headline-md text-headline-md text-on-surface tabular-nums">
            {loading ? <div className="h-7 bg-surface-container rounded animate-pulse w-24" /> : formatRupiahShort(summary.totalTagihan)}
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="font-body-sm text-body-sm text-secondary mb-1">Tagihan Lunas</div>
          <div className="font-headline-md text-headline-md text-primary tabular-nums">
            {loading ? <div className="h-7 bg-surface-container rounded animate-pulse w-16" /> : `${summary.lunasPercent}%`}
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="font-body-sm text-body-sm text-secondary mb-1">Tunggakan Berjalan</div>
          <div className="font-headline-md text-headline-md text-error tabular-nums">
            {loading ? <div className="h-7 bg-surface-container rounded animate-pulse w-24" /> : formatRupiahShort(summary.tunggakanAmount)}
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="font-body-sm text-body-sm text-secondary mb-1">Jatuh Tempo Mendekat</div>
          <div className="font-headline-md text-headline-md text-error tabular-nums">
            {loading ? <div className="h-7 bg-surface-container rounded animate-pulse w-16" /> : <>{summary.nearDue} <span className="text-sm">Tagihan</span></>}
          </div>
        </div>
      </div>

      {/* Table */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-surface flex flex-wrap gap-3 border-b border-outline-variant items-center justify-between">
          <div className="flex gap-3 flex-grow max-w-2xl">
            <div className="relative flex-grow">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container-lowest"
                placeholder="Cari Nama, NIM, atau No Tagihan..."
                type="text"
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <select
              className="px-3 py-2 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedPeriod}
              onChange={e => { setSelectedPeriod(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Semua Periode</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <select
            className="px-3 py-2 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value as BillStatus | ''); setCurrentPage(1) }}
          >
            <option value="">Semua Status</option>
            <option value="lunas">Lunas</option>
            <option value="belum bayar">Belum Bayar</option>
            <option value="sebagian">Sebagian</option>
          </select>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">No Tagihan</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Mahasiswa</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Jenis Tagihan</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Jatuh Tempo</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Nominal (Rp)</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-28" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-28" /><div className="h-3 bg-surface-container rounded w-16 mt-1" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-20" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-20 ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-5 bg-surface-container rounded-full w-16 mx-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline mb-2 block">receipt_long</span>
                    <div className="font-body-md text-body-md text-secondary">Tidak ada tagihan ditemukan.</div>
                  </td>
                </tr>
              ) : (
                bills.map(bill => {
                  const isOverdue = new Date(bill.due_date) < new Date() && bill.status !== 'lunas'
                  return (
                    <tr key={bill.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-4 py-3 font-financial-data text-financial-data text-secondary text-xs">{bill.invoice_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-body-md text-body-md font-medium text-on-surface">{bill.students.name}</div>
                        <div className="font-financial-data text-financial-data text-secondary text-xs">{bill.students.nim}</div>
                      </td>
                      <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface">{bill.fee_profiles.name}</td>
                      <td className={`px-4 py-3 font-body-sm text-body-sm ${isOverdue ? 'text-error font-medium' : 'text-secondary'}`}>
                        {new Date(bill.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-financial-data text-financial-data text-on-surface text-right tabular-nums">{formatRupiah(bill.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <BillStatusBadge status={bill.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {bill.status === 'belum bayar' && (
                          <button onClick={() => setBillToDelete(bill.id)} className="text-error hover:text-on-error-container font-body-sm text-body-sm font-medium mr-3">Hapus</button>
                        )}
                        <button className="text-secondary hover:text-primary font-body-sm text-body-sm font-medium mr-2">Detail</button>
                        {bill.status !== 'lunas' && (
                          <button className="text-primary hover:text-surface-tint font-body-sm text-body-sm font-medium">Kirim Reminder</button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-outline-variant bg-surface flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-secondary">
            {loading ? '...' : `Menampilkan ${totalCount === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, totalCount)} dari ${totalCount}`}
          </span>
          <div className="flex gap-1">
            <button className="p-1 rounded hover:bg-surface-container text-secondary disabled:opacity-50" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1
              return (
                <button key={pageNum} className={`px-2 py-1 rounded font-body-sm text-body-sm ${pageNum === currentPage ? 'bg-primary text-on-primary' : 'hover:bg-surface-container text-secondary'}`} onClick={() => setCurrentPage(pageNum)}>
                  {pageNum}
                </button>
              )
            })}
            <button className="p-1 rounded hover:bg-surface-container text-secondary disabled:opacity-50" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* Modals */}
      {isIndividualOpen && (
        <IndividualBillModal 
          onClose={() => setIsIndividualOpen(false)}
          onSuccess={(newPeriod) => { 
            setIsIndividualOpen(false); 
            refetch(); 
            refetchPeriods();
            if (newPeriod) setSelectedPeriod(newPeriod);
          }}
        />
      )}

      {isBulkOpen && (
        <BulkBillModal 
          onClose={() => setIsBulkOpen(false)}
          onSuccess={(newPeriod) => { 
            setIsBulkOpen(false); 
            refetch(); 
            refetchPeriods();
            if (newPeriod) setSelectedPeriod(newPeriod);
          }}
        />
      )}

      {billToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-error">warning</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Hapus Tagihan?</h3>
              </div>
              <p className="font-body-md text-body-md text-secondary">
                Apakah Anda yakin ingin menghapus tagihan ini? Data tagihan akan dihapus permanen dan tidak dapat dikembalikan.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3 bg-surface">
              <button 
                onClick={() => setBillToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 font-body-md text-body-md font-medium text-secondary hover:bg-surface-container rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 font-body-md text-body-md font-medium bg-error text-on-error hover:bg-error/90 rounded-lg transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Menghapus...
                  </>
                ) : (
                  'Hapus Tagihan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function BillStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    'lunas': { bg: 'bg-primary-container', text: 'text-on-primary-container', label: 'Lunas' },
    'belum bayar': { bg: 'bg-error-container', text: 'text-on-error-container', label: 'Belum Bayar' },
    'sebagian': { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed', label: 'Sebagian' },
  }
  const c = config[status] ?? { bg: 'bg-surface-container-highest', text: 'text-on-surface', label: status }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>
}

// ==========================================
// Modals
// ==========================================

function IndividualBillModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (period?: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Student Search
  const [studentSearch, setStudentSearch] = useState('')
  const debouncedStudentSearch = useDebounce(studentSearch, 300)
  const { students } = useStudents({ search: debouncedStudentSearch, status: 'Aktif' })
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  
  const { feeProfiles } = useFeeProfiles()

  const [feeProfileId, setFeeProfileId] = useState('')
  
  const currentYear = new Date().getFullYear()
  const availablePeriods = useMemo(() => sortPeriodsDesc(generateStandardPeriods(currentYear - 1, currentYear + 1)), [currentYear])
  const [period, setPeriod] = useState(availablePeriods[12]) // Default to roughly current month

  const [dueDate, setDueDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return setError('Silakan pilih mahasiswa')
    if (!feeProfileId) return setError('Silakan pilih komponen biaya')

    const selectedFee = feeProfiles.find(f => f.id === feeProfileId)
    if (!selectedFee) return setError('Komponen biaya tidak ditemukan')

    setLoading(true)
    setError(null)
    
    try {
      const bill: BillInsert = {
        invoice_number: `INV-${Date.now()}`,
        student_id: selectedStudent.id,
        fee_profile_id: feeProfileId,
        period,
        due_date: dueDate,
        amount: selectedFee.amount,
        status: 'belum bayar'
      }
      await createBill(bill)
      onSuccess(period)
    } catch (err: any) {
      setError(err.message || 'Gagal membuat tagihan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Buat Tagihan Individu</h3>
          <button onClick={onClose} className="text-secondary hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm flex gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* Student Search */}
          <div className="relative">
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Cari Mahasiswa</label>
            {selectedStudent ? (
              <div className="flex justify-between items-center px-3 py-2 bg-primary-container/20 border border-primary-container rounded-lg">
                <div>
                  <div className="font-body-md text-body-md font-medium text-on-surface">{selectedStudent.name}</div>
                  <div className="font-financial-data text-financial-data text-secondary text-xs">{selectedStudent.nim}</div>
                </div>
                <button type="button" onClick={() => setSelectedStudent(null)} className="text-error">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <div>
                <input 
                  type="text" 
                  placeholder="Ketik Nama atau NIM..." 
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" 
                  value={studentSearch} 
                  onChange={e => setStudentSearch(e.target.value)} 
                />
                {studentSearch && students.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {students.map(s => (
                      <li 
                        key={s.id} 
                        className="px-3 py-2 hover:bg-surface-container cursor-pointer border-b border-outline-variant/50 last:border-0"
                        onClick={() => { setSelectedStudent(s); setStudentSearch('') }}
                      >
                        <div className="font-body-sm text-body-sm font-medium text-on-surface">{s.name}</div>
                        <div className="font-financial-data text-financial-data text-secondary text-xs">{s.nim}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Komponen Biaya</label>
            <select required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={feeProfileId} onChange={e => setFeeProfileId(e.target.value)}>
              <option value="">-- Pilih Komponen Biaya --</option>
              {feeProfiles.filter(f => f.is_active).map(fp => (
                <option key={fp.id} value={fp.id}>{fp.name} (Rp {formatRupiah(fp.amount)})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Periode</label>
              <select required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="">-- Pilih Periode --</option>
                {availablePeriods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Jatuh Tempo</label>
              <input type="date" required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-outline-variant flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 font-body-md text-body-md font-medium text-secondary hover:bg-surface-container rounded-lg">Batal</button>
            <button type="submit" disabled={loading} className="px-4 py-2 font-body-md text-body-md font-medium bg-primary text-on-primary hover:bg-surface-tint rounded-lg disabled:opacity-70">
              {loading ? 'Memproses...' : 'Buat Tagihan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BulkBillModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (period?: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { feeProfiles } = useFeeProfiles()
  
  // States
  const [useDefaultProfile, setUseDefaultProfile] = useState(true)
  const [feeProfileId, setFeeProfileId] = useState('')
  const [program, setProgram] = useState<StudentProgram | ''>('')
  
  const currentYear = new Date().getFullYear()
  const availablePeriods = useMemo(() => sortPeriodsDesc(generateStandardPeriods(currentYear - 1, currentYear + 1)), [currentYear])
  const [period, setPeriod] = useState(availablePeriods[12]) // Default to roughly current month

  const [dueDate, setDueDate] = useState('')

  // We need to fetch students to know how many bills we will generate
  // In a real prod environment with thousands of students, you'd want a separate "Count" API.
  // But here, useStudents fetches them. To avoid fetching all at once until needed, we just fetch with large page size on submit.
  const { students: allActiveStudents } = useStudents({ status: 'Aktif', program, pageSize: 1000 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!useDefaultProfile && !feeProfileId) return setError('Silakan pilih komponen biaya')
    if (allActiveStudents.length === 0) return setError('Tidak ada mahasiswa aktif yang sesuai kriteria filter')

    setLoading(true)
    setError(null)
    
    try {
      const timestamp = Date.now()
      const billsToInsert: BillInsert[] = []

      for (let i = 0; i < allActiveStudents.length; i++) {
        const student = allActiveStudents[i]
        
        let targetFeeProfileId = ''
        let targetAmount = 0
        let feeCategory = ''

        if (useDefaultProfile) {
          if (!student.fee_profile_id) continue // Skip student without default profile
          const fp = feeProfiles.find(f => f.id === student.fee_profile_id)
          if (!fp || !fp.is_active) continue // Skip if profile is inactive or deleted
          targetFeeProfileId = fp.id
          targetAmount = fp.amount
          feeCategory = fp.category
        } else {
          const fp = feeProfiles.find(f => f.id === feeProfileId)
          if (!fp) continue
          targetFeeProfileId = fp.id
          targetAmount = fp.amount
          feeCategory = fp.category
        }

        // --- BUSINESS LOGIC: Mahasiswa Beasiswa DO NOT pay SPP (Bulanan) ---
        if (feeCategory === 'Bulanan' && student.program === 'Beasiswa') {
          continue
        }

        billsToInsert.push({
          invoice_number: `INV-${timestamp}-${i}`,
          student_id: student.id,
          fee_profile_id: targetFeeProfileId,
          period,
          due_date: dueDate,
          amount: targetAmount,
          status: 'belum bayar'
        })
      }

      if (billsToInsert.length === 0) {
        throw new Error('Tidak ada tagihan yang bisa digenerate. Pastikan mahasiswa memiliki Profil Biaya Default jika memilih opsi tersebut.')
      }

      await createBillsBulk(billsToInsert)
      onSuccess(period)
    } catch (err: any) {
      setError(err.message || 'Gagal men-generate tagihan kolektif')
    } finally {
      setLoading(false)
    }
  }

  // Count valid students for summary
  const validStudentsCount = useDefaultProfile 
    ? allActiveStudents.filter(s => s.fee_profile_id).length 
    : allActiveStudents.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Generate Tagihan Kolektif</h3>
          <button onClick={onClose} className="text-secondary hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm flex gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <label className="flex items-center gap-2 p-3 bg-surface border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-lowest">
              <input type="radio" checked={useDefaultProfile} onChange={() => setUseDefaultProfile(true)} className="text-primary focus:ring-primary" />
              <div>
                <div className="font-body-md text-body-md font-medium text-on-surface">Gunakan Profil Biaya Default</div>
                <div className="font-body-sm text-body-sm text-secondary">Ideal untuk tagihan SPP rutin. Sesuai setting tiap mahasiswa.</div>
              </div>
            </label>
            <label className="flex items-center gap-2 p-3 bg-surface border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-lowest">
              <input type="radio" checked={!useDefaultProfile} onChange={() => setUseDefaultProfile(false)} className="text-primary focus:ring-primary" />
              <div>
                <div className="font-body-md text-body-md font-medium text-on-surface">Pilih Komponen Spesifik</div>
                <div className="font-body-sm text-body-sm text-secondary">Tagih komponen seragam (misal: Uang Pangkal) ke semua mahasiswa terpilih.</div>
              </div>
            </label>
          </div>

          {!useDefaultProfile && (
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Komponen Biaya</label>
              <select required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={feeProfileId} onChange={e => setFeeProfileId(e.target.value)}>
                <option value="">-- Pilih Komponen Biaya --</option>
                {feeProfiles.filter(f => f.is_active).map(fp => (
                  <option key={fp.id} value={fp.id}>{fp.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Filter Program Studi (Opsional)</label>
            <select className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={program} onChange={e => setProgram(e.target.value as StudentProgram)}>
              <option value="">Semua Program Studi</option>
              <option value="Reguler Asrama">Reguler Asrama</option>
              <option value="Non-Asrama">Non-Asrama</option>
              <option value="Beasiswa">Beasiswa</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Periode</label>
              <select required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="">-- Pilih Periode --</option>
                {availablePeriods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Jatuh Tempo</label>
              <input type="date" required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="bg-primary-container/20 border border-primary-container rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-0.5">info</span>
            <div>
              <div className="font-body-md text-body-md font-medium text-on-surface">Summary Generate</div>
              <div className="font-body-sm text-body-sm text-secondary mt-1">
                Akan membuat tagihan untuk <strong className="text-on-surface">{validStudentsCount}</strong> mahasiswa aktif.
                {useDefaultProfile && ' (Mahasiswa tanpa profil biaya default diabaikan)'}
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-outline-variant flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 font-body-md text-body-md font-medium text-secondary hover:bg-surface-container rounded-lg">Batal</button>
            <button type="submit" disabled={loading || validStudentsCount === 0} className="px-4 py-2 font-body-md text-body-md font-medium bg-primary text-on-primary hover:bg-surface-tint rounded-lg disabled:opacity-70">
              {loading ? 'Memproses...' : `Generate ${validStudentsCount} Tagihan`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
