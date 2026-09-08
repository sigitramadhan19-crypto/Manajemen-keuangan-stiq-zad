import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useStudents, useDebounce, useBills, usePayments } from '../lib/hooks'
import { formatRupiah, supabase, createPayment, getPendingPayments, verifyPayment } from '../lib/api'
import type { Student, BillWithStudent, PaymentInsert } from '../lib/database.types'

export const Route = createFileRoute('/_auth/pembayaran')({
  component: PembayaranComponent,
})

function PembayaranComponent() {
  const [activeTab, setActiveTab] = useState<'kasir' | 'verifikasi' | 'riwayat'>('kasir')

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Manajemen Pembayaran</h2>
          <p className="font-body-sm text-body-sm text-secondary">Terima pembayaran manual atau verifikasi transfer mahasiswa.</p>
        </div>
        
        {/* Tab Switching */}
        <div className="flex bg-surface-container-lowest p-1 rounded-xl border border-outline-variant shadow-sm w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('kasir')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-body-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'kasir' 
                ? 'bg-primary text-on-primary shadow-sm' 
                : 'text-secondary hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Kasir Manual
          </button>
          <button
            onClick={() => setActiveTab('verifikasi')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-body-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'verifikasi' 
                ? 'bg-primary text-on-primary shadow-sm' 
                : 'text-secondary hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Persetujuan Pembayaran
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-body-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'riwayat' 
                ? 'bg-primary text-on-primary shadow-sm' 
                : 'text-secondary hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Riwayat Transaksi
          </button>
        </div>
      </div>

      {activeTab === 'kasir' ? <KasirManual /> : activeTab === 'verifikasi' ? <VerifikasiOnline /> : <RiwayatTransaksi />}
    </>
  )
}

function KasirManual() {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500)
  
  const { students, loading: studentsLoading } = useStudents(
    debouncedSearch.length >= 3 ? { search: debouncedSearch, pageSize: 5 } : { pageSize: 0 }
  )

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const { bills, loading: billsLoading, refetch: refetchBills } = useBills(
    selectedStudent ? { studentId: selectedStudent.id, pageSize: 50 } : { pageSize: 0 }
  )

  const unpaidBills = bills.filter(b => b.status !== 'lunas' && b.student_id === selectedStudent?.id)
  const [paymentModalData, setPaymentModalData] = useState<BillWithStudent | null>(null)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      <div className="lg:col-span-1">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <h3 className="font-body-lg text-body-lg font-medium text-on-surface mb-4">Cari Mahasiswa</h3>
          
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Ketik NIM atau Nama..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {studentsLoading && <div className="text-secondary font-body-sm text-center py-4">Mencari...</div>}
            {!studentsLoading && debouncedSearch.length >= 3 && students.length === 0 && (
              <div className="text-secondary font-body-sm text-center py-4">Mahasiswa tidak ditemukan.</div>
            )}
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedStudent(s); setSearchInput('') }}
                className="w-full text-left p-3 rounded-lg border border-outline-variant hover:bg-primary-container/30 transition-colors flex justify-between items-center"
              >
                <div>
                  <div className="font-body-md text-body-md font-medium text-on-surface">{s.name}</div>
                  <div className="font-financial-data text-financial-data text-secondary text-sm">{s.nim}</div>
                </div>
                <span className="material-symbols-outlined text-primary">arrow_forward</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedStudent ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="bg-primary-container p-5 flex items-start gap-4">
              <div className="w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center font-headline-sm flex-shrink-0">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-primary-container">{selectedStudent.name}</h3>
                <div className="font-body-md text-body-md text-on-primary-container/80 mt-1 flex gap-4">
                  <span>NIM: <strong className="font-financial-data">{selectedStudent.nim}</strong></span>
                  <span>Program: <strong>{selectedStudent.program}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="ml-auto w-8 h-8 rounded-full bg-surface/30 text-on-primary-container hover:bg-surface/50 flex items-center justify-center transition-colors"
                title="Tutup Profil"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 flex-grow">
              <h4 className="font-body-lg text-body-lg font-medium text-on-surface mb-4">Tagihan Belum Lunas</h4>
              
              {billsLoading ? (
                <div className="space-y-3">
                  <div className="h-20 bg-surface-container rounded-xl animate-pulse"></div>
                </div>
              ) : unpaidBills.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-outline-variant rounded-xl bg-surface">
                  <span className="material-symbols-outlined text-[48px] text-tertiary mb-3 block">verified</span>
                  <div className="font-body-lg text-body-lg text-on-surface">Alhamdulillah!</div>
                  <div className="font-body-md text-body-md text-secondary">Tidak ada tagihan yang tertunggak.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {unpaidBills.map(bill => {
                    const isOverdue = new Date(bill.due_date) < new Date()
                    return (
                      <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-outline-variant rounded-xl bg-surface hover:shadow-md transition-shadow gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-body-md text-body-md font-medium text-on-surface">{bill.fee_profiles.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${bill.status === 'sebagian' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-on-error-container'}`}>
                              {bill.status}
                            </span>
                          </div>
                          <div className="font-body-sm text-body-sm text-secondary flex items-center gap-2">
                            <span>Periode: {bill.period}</span>
                            <span className="w-1 h-1 bg-outline rounded-full"></span>
                            <span className={isOverdue ? 'text-error font-medium' : ''}>
                              Jatuh Tempo: {new Date(bill.due_date).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-financial-data text-financial-data text-on-surface text-lg">
                              {formatRupiah(bill.amount)}
                            </div>
                            <div className="font-financial-data text-secondary text-xs">
                              {bill.invoice_number}
                            </div>
                          </div>
                          <button 
                            onClick={() => setPaymentModalData(bill)}
                            className="px-4 py-2 bg-primary text-on-primary hover:bg-surface-tint rounded-lg font-body-md font-medium transition-colors whitespace-nowrap shadow-sm"
                          >
                            Bayar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex items-center justify-center h-full min-h-[400px] shadow-sm">
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[36px] text-secondary">person_search</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Belum Ada Mahasiswa Terpilih</h3>
              <p className="font-body-md text-body-md text-secondary max-w-sm mx-auto">
                Silakan cari dan pilih mahasiswa di panel kiri untuk memproses pembayaran.
              </p>
            </div>
          </div>
        )}
      </div>

      {paymentModalData && (
        <PaymentModal 
          bill={paymentModalData} 
          onClose={() => setPaymentModalData(null)} 
          onSuccess={() => { setPaymentModalData(null); refetchBills() }} 
        />
      )}
    </div>
  )
}

function VerifikasiOnline() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  
  // Selected proof for zoom
  const [zoomedProof, setZoomedProof] = useState<string | null>(null)

  // Custom Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, paymentId: string, action: 'verified' | 'rejected'} | null>(null)

  const fetchPending = async () => {
    try {
      setLoading(true)
      const { data } = await getPendingPayments()
      setPayments(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const handleAction = (paymentId: string, action: 'verified' | 'rejected') => {
    setConfirmModal({ isOpen: true, paymentId, action })
  }

  const executeAction = async () => {
    if (!confirmModal) return
    const { paymentId, action } = confirmModal
    
    try {
      setVerifyingId(paymentId)
      await verifyPayment(paymentId, action)
      setConfirmModal(null)
      fetchPending()
    } catch (err) {
      alert('Gagal memverifikasi pembayaran. Coba lagi.')
    } finally {
      setVerifyingId(null)
    }
  }

  return (
    <div className="animate-in fade-in duration-300">
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-surface-container rounded-xl animate-pulse"></div>)}
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center justify-center p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-[64px] text-tertiary mb-4">inbox</span>
          <h3 className="font-headline-sm font-bold text-on-surface mb-2">Tidak Ada Pembayaran Menunggu</h3>
          <p className="font-body-md text-secondary">Semua transfer mahasiswa telah diverifikasi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {payments.map(payment => (
            <div key={payment.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col gap-4">
              {/* Data & Actions */}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-body-md text-secondary mb-1">TRX: {payment.transaction_number}</div>
                    <h3 className="font-headline-sm font-bold text-on-surface">{payment.bills.students.name}</h3>
                    <div className="font-body-sm text-on-surface font-medium">{payment.bills.students.nim}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-headline-sm font-bold text-primary">Rp {formatRupiah(payment.amount)}</div>
                    <div className="font-body-xs font-bold px-2 py-0.5 mt-1 bg-tertiary-container text-on-tertiary-container rounded uppercase tracking-wider inline-block">
                      {payment.method}
                    </div>
                  </div>
                </div>

                <div className="bg-surface p-3 rounded-lg border border-outline-variant mt-2 mb-4">
                  <div className="font-body-sm text-secondary">Untuk Tagihan:</div>
                  <div className="font-body-md font-bold text-on-surface">{payment.bills.fee_profiles.name}</div>
                  <div className="font-body-sm text-secondary">Periode: {payment.bills.period}</div>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-outline-variant">
                  <span className="font-body-xs text-secondary mr-auto">
                    Diunggah: {new Date(payment.created_at).toLocaleString('id-ID')}
                  </span>
                  
                  {payment.proof_url && (
                    <button 
                      onClick={() => setZoomedProof(payment.proof_url)}
                      className="px-4 py-2 bg-surface hover:bg-surface-container-highest text-on-surface rounded-lg font-body-sm font-medium transition-colors flex items-center gap-2 border border-outline-variant"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      Lihat Bukti
                    </button>
                  )}

                  <button 
                    onClick={() => handleAction(payment.id, 'rejected')}
                    disabled={verifyingId === payment.id}
                    className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-lg font-body-sm font-bold transition-colors disabled:opacity-50"
                  >
                    Tolak Bukti
                  </button>
                  <button 
                    onClick={() => handleAction(payment.id, 'verified')}
                    disabled={verifyingId === payment.id}
                    className="px-6 py-2 bg-primary hover:bg-surface-tint text-on-primary rounded-lg font-body-sm font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {verifyingId === payment.id ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    )}
                    Terima & Lunas
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedProof && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setZoomedProof(null)}
        >
          <button className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
          <img src={zoomedProof} alt="Bukti Transfer Zoom" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className={`p-6 ${confirmModal.action === 'verified' ? 'bg-primary-container' : 'bg-error-container'} flex items-center gap-4 border-b border-outline-variant/30`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${confirmModal.action === 'verified' ? 'bg-primary text-on-primary' : 'bg-error text-on-error'}`}>
                <span className="material-symbols-outlined text-[24px]">
                  {confirmModal.action === 'verified' ? 'check_circle' : 'cancel'}
                </span>
              </div>
              <div>
                <h3 className={`font-headline-sm font-bold ${confirmModal.action === 'verified' ? 'text-on-primary-container' : 'text-on-error-container'}`}>Konfirmasi Tindakan</h3>
                <p className={`font-body-sm ${confirmModal.action === 'verified' ? 'text-on-primary-container/80' : 'text-on-error-container/80'}`}>Verifikasi Pembayaran</p>
              </div>
            </div>
            <div className="p-6">
              <p className="font-body-md text-on-surface">
                Apakah Anda yakin ingin <strong className={confirmModal.action === 'verified' ? 'text-primary' : 'text-error'}>{confirmModal.action === 'verified' ? 'Menerima' : 'Menolak'}</strong> pembayaran ini?
              </p>
              {confirmModal.action === 'verified' ? (
                <p className="font-body-sm text-secondary mt-2">Tagihan akan ditandai lunas dan saldo akan masuk ke sistem.</p>
              ) : (
                <p className="font-body-sm text-secondary mt-2">Bukti pembayaran akan ditolak dan tagihan kembali ke status belum bayar.</p>
              )}
            </div>
            <div className="px-6 py-4 bg-surface flex justify-end gap-3 border-t border-outline-variant">
              <button 
                onClick={() => setConfirmModal(null)} 
                disabled={verifyingId !== null}
                className="px-4 py-2 font-body-md font-medium text-secondary hover:bg-surface-container rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={executeAction}
                disabled={verifyingId !== null}
                className={`px-4 py-2 font-body-md font-medium rounded-lg transition-colors flex items-center gap-2 ${confirmModal.action === 'verified' ? 'bg-primary text-on-primary hover:bg-surface-tint' : 'bg-error text-on-error hover:bg-error/90'}`}
              >
                {verifyingId !== null ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Memproses...
                  </>
                ) : (
                  confirmModal.action === 'verified' ? 'Ya, Terima' : 'Ya, Tolak'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentModal({ bill, onClose, onSuccess }: { bill: BillWithStudent, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [amountInput, setAmountInput] = useState(bill.amount.toString()) 
  const [method, setMethod] = useState('Tunai')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const numAmount = parseInt(amountInput.replace(/\D/g, ''), 10)
    if (!numAmount || numAmount <= 0) {
      setError('Nominal tidak valid')
      setLoading(false)
      return
    }

    try {
      const payment: PaymentInsert = {
        transaction_number: `TRX-${Date.now()}`,
        bill_id: bill.id,
        amount: numAmount,
        method,
        status: 'verified', 
        notes: notes || `Pembayaran Kasir via ${method}`
      }

      await createPayment(payment)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Gagal memproses pembayaran')
    } finally {
      setLoading(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    setAmountInput(val)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Terima Pembayaran Manual</h3>
          <button onClick={onClose} className="text-secondary hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm flex gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <div className="bg-surface p-4 border border-outline-variant rounded-xl">
            <div className="font-body-sm text-body-sm text-secondary mb-1">Pembayaran Untuk:</div>
            <div className="font-body-lg font-medium text-on-surface">{bill.fee_profiles.name}</div>
            <div className="font-body-md text-secondary">Periode: {bill.period}</div>
            <div className="mt-3 pt-3 border-t border-outline-variant flex justify-between items-center">
              <span className="font-body-sm text-secondary">Total Tagihan:</span>
              <span className="font-financial-data text-lg text-on-surface">{formatRupiah(bill.amount)}</span>
            </div>
          </div>

          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Nominal (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-medium">Rp</span>
              <input 
                type="text" 
                required 
                className="w-full pl-9 pr-4 py-3 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary font-financial-data text-lg outline-none transition-all" 
                value={amountInput ? new Intl.NumberFormat('id-ID').format(parseInt(amountInput)) : ''}
                onChange={handleAmountChange}
              />
            </div>
            {parseInt(amountInput || '0') > bill.amount && (
              <p className="text-error font-body-sm mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                Nominal melebihi total tagihan
              </p>
            )}
          </div>

          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Metode Penerimaan</label>
            <select 
              required 
              className="w-full px-3 py-3 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary font-body-md outline-none transition-all" 
              value={method} 
              onChange={e => setMethod(e.target.value)}
            >
              <option value="Tunai">Tunai / Cash</option>
              <option value="Transfer BSI">Transfer BSI</option>
              <option value="Transfer Mandiri">Transfer Mandiri</option>
            </select>
          </div>

          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Catatan (Opsional)</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" 
              placeholder="Contoh: Diterima oleh staf kasir"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="bg-primary-container/20 border border-primary-container rounded-xl p-3 flex gap-2">
            <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">auto_awesome</span>
            <p className="font-body-sm text-secondary text-sm">
              Status tagihan akan otomatis ter-update di sistem setelah kasir menekan tombol proses.
            </p>
          </div>
          
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 font-body-md text-body-md font-medium text-secondary hover:bg-surface-container rounded-lg transition-colors">Batal</button>
            <button type="submit" disabled={loading} className="px-5 py-2 font-body-md text-body-md font-medium bg-primary text-on-primary hover:bg-surface-tint rounded-lg disabled:opacity-70 flex items-center gap-2 shadow-sm transition-colors">
              {loading ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Memproses...</>
              ) : (
                'Proses Pembayaran'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RiwayatTransaksi() {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [zoomedProof, setZoomedProof] = useState<string | null>(null)
  
  const { payments, loading } = usePayments({
    search: debouncedSearch,
    status: statusFilter as any,
    pageSize: 50
  })

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Cari No Transaksi..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <select
            className="w-full sm:w-48 px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="verified">Diterima / Lunas</option>
            <option value="pending">Menunggu Verifikasi</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-container rounded-lg animate-pulse"></div>)}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[48px] text-secondary/50 mb-2">history</span>
            <p className="font-body-md text-secondary">Belum ada riwayat transaksi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-outline-variant">
                  <th className="py-3 px-4 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Tanggal</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps text-secondary uppercase tracking-wider">No Transaksi</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Mahasiswa</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Nominal</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Metode</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="font-body-sm">
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">{new Date(p.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="py-3 px-4 font-financial-data text-secondary">{p.transaction_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-on-surface">{p.bills?.students?.name}</div>
                      <div className="text-xs text-secondary">{p.bills?.students?.nim}</div>
                    </td>
                    <td className="py-3 px-4 font-financial-data font-bold">Rp {formatRupiah(p.amount)}</td>
                    <td className="py-3 px-4"><span className="bg-surface-container px-2 py-1 rounded text-xs border border-outline-variant/50">{p.method}</span></td>
                    <td className="py-3 px-4">
                      {p.status === 'verified' && <span className="text-xs font-bold text-primary bg-primary-container/20 px-2 py-1 rounded">Diterima</span>}
                      {p.status === 'pending' && <span className="text-xs font-bold text-tertiary bg-tertiary-container/20 px-2 py-1 rounded">Pending</span>}
                      {p.status === 'rejected' && <span className="text-xs font-bold text-error bg-error-container/20 px-2 py-1 rounded">Ditolak</span>}
                    </td>
                    <td className="py-3 px-4">
                      {p.proof_url && (
                        <button 
                          onClick={() => setZoomedProof(p.proof_url)}
                          className="px-3 py-1.5 bg-surface hover:bg-surface-container-highest text-on-surface rounded font-body-xs font-medium transition-colors flex items-center gap-1 border border-outline-variant shadow-sm"
                          title="Lihat Bukti Transfer"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Bukti
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Zoom Modal for Riwayat */}
      {zoomedProof && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setZoomedProof(null)}
        >
          <button className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
          <img src={zoomedProof} alt="Bukti Transfer Zoom" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  )
}
