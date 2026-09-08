import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useContext, useRef } from 'react'
import { StudentContext } from './student'
import { getBills, formatRupiah, uploadPaymentProof, submitPayment } from '../lib/api'
import type { Student } from '../lib/database.types'

export const Route = createFileRoute('/student/tagihan')({
  component: StudentTagihan,
})

function StudentTagihan() {
  const { student } = useContext(StudentContext)
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'semua' | 'belum_lunas' | 'lunas'>('belum_lunas')
  
  // Payment Modal State
  const [selectedBill, setSelectedBill] = useState<any | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Transfer BSI')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchBillsData = async () => {
    try {
      setLoading(true)
      const { data } = await getBills({ studentId: student?.id })
      setBills(data || [])
    } catch (err) {
      console.error('Error fetching student bills:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (student?.id) fetchBillsData()
  }, [student?.id])

  const handlePayClick = (bill: any) => {
    setSelectedBill(bill)
    setPayAmount(bill.amount.toString()) // Default lunas
    setPayMethod('Transfer BSI')
    setProofFile(null)
    setSubmitError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0])
    }
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBill) return
    if (!proofFile) {
      setSubmitError('Silakan unggah bukti transfer.')
      return
    }

    const amountNum = parseInt(payAmount.replace(/\D/g, ''))
    if (isNaN(amountNum) || amountNum <= 0) {
      setSubmitError('Nominal pembayaran tidak valid.')
      return
    }
    if (amountNum > selectedBill.amount) {
      setSubmitError('Nominal tidak boleh melebihi total tagihan.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // 1. Upload proof
      const proofUrl = await uploadPaymentProof(proofFile)

      // 2. Submit payment record
      await submitPayment({
        bill_id: selectedBill.id,
        amount: amountNum,
        method: payMethod,
        proof_url: proofUrl
      })

      // Success
      setShowSuccessModal(true)
      setSelectedBill(null)
      fetchBillsData() // Refresh bills data (maybe bill status won't change until verified, but we can refresh anyway)

    } catch (err: any) {
      setSubmitError(err.message || 'Gagal mengirim pembayaran. Coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading && bills.length === 0) {
    return (
      <div className="p-4 space-y-4 animate-pulse mt-4">
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-surface-container rounded-full"></div>
          <div className="h-8 w-24 bg-surface-container rounded-full"></div>
        </div>
        <div className="space-y-3">
          <div className="h-24 bg-surface-container rounded-xl"></div>
          <div className="h-24 bg-surface-container rounded-xl"></div>
        </div>
      </div>
    )
  }

  const filteredBills = bills.filter(b => {
    if (filter === 'belum_lunas') return b.status !== 'lunas'
    if (filter === 'lunas') return b.status === 'lunas'
    return true
  })

  return (
    <div className="p-4 relative">
      <div className="mb-6">
        <h2 className="font-headline-md font-bold text-on-surface mb-4">Daftar Tagihan</h2>
        
        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setFilter('belum_lunas')}
            className={`px-4 py-1.5 rounded-full font-body-sm font-medium whitespace-nowrap transition-colors ${filter === 'belum_lunas' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface border border-outline-variant'}`}
          >
            Belum Lunas
          </button>
          <button 
            onClick={() => setFilter('lunas')}
            className={`px-4 py-1.5 rounded-full font-body-sm font-medium whitespace-nowrap transition-colors ${filter === 'lunas' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface border border-outline-variant'}`}
          >
            Lunas
          </button>
          <button 
            onClick={() => setFilter('semua')}
            className={`px-4 py-1.5 rounded-full font-body-sm font-medium whitespace-nowrap transition-colors ${filter === 'semua' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface border border-outline-variant'}`}
          >
            Semua
          </button>
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="text-center py-12 text-secondary">
          <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">receipt_long</span>
          <div className="font-body-md font-medium">Tidak ada tagihan.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBills.map(bill => {
            const totalVerified = bill.payments?.filter((p: any) => p.status === 'verified').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
            const totalPending = bill.payments?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
            const sisaTagihan = bill.amount - totalVerified

            let displayStatus = bill.status === 'lunas' ? 'Lunas' : bill.status === 'sebagian' ? 'Sebagian' : 'Belum Bayar'
            let statusColor = bill.status === 'lunas' ? 'bg-primary-container text-on-primary-container' : 
                              bill.status === 'sebagian' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-on-error-container'
            
            if (bill.status !== 'lunas' && totalPending > 0) {
              displayStatus = 'Sedang Diverifikasi'
              statusColor = 'bg-surface-variant text-on-surface-variant'
            }

            return (
              <div key={bill.id} className="bg-surface rounded-2xl p-4 border border-outline-variant shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  bill.status === 'lunas' ? 'bg-primary' : 
                  totalPending > 0 ? 'bg-secondary' :
                  bill.status === 'sebagian' ? 'bg-tertiary' : 'bg-error'
                }`}></div>
                
                <div className="pl-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-body-md font-bold text-on-surface">{bill.fee_profiles.name}</div>
                      <div className="font-body-sm text-secondary">{bill.period}</div>
                    </div>
                    <div className={`font-body-xs px-2 py-0.5 rounded-md font-bold ${statusColor}`}>
                      {displayStatus}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-4">
                    <div className="font-body-xs text-secondary">
                      Jatuh Tempo:<br/>
                      <span className="font-medium text-on-surface">{new Date(bill.due_date).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="text-right">
                      {totalVerified > 0 && bill.status !== 'lunas' && (
                        <div className="font-body-xs text-secondary line-through">
                          Rp {formatRupiah(bill.amount)}
                        </div>
                      )}
                      <div className={`font-headline-sm font-bold ${bill.status === 'lunas' ? 'text-primary' : 'text-error'}`}>
                        {bill.status === 'lunas' ? `Rp ${formatRupiah(bill.amount)}` : `Sisa: Rp ${formatRupiah(sisaTagihan)}`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Aksi Pembayaran */}
                  {bill.status !== 'lunas' && (
                    <div className="mt-4 pt-3 border-t border-outline-variant/50">
                      <button 
                        onClick={() => {
                          setSelectedBill(bill)
                          setPayAmount(sisaTagihan.toString())
                          setPayMethod('Transfer BSI')
                          setProofFile(null)
                          setSubmitError(null)
                        }}
                        className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-body-sm font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                        {totalPending > 0 ? 'Kirim Bukti Pembayaran Lagi' : 'Bayar Tagihan Ini'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300">
            
            <div className="flex justify-between items-center p-4 border-b border-outline-variant">
              <h3 className="font-headline-sm font-bold text-on-surface">Konfirmasi Pembayaran</h3>
              <button 
                onClick={() => setSelectedBill(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-5">
              {submitError && (
                <div className="p-3 bg-error-container text-on-error-container rounded-xl font-body-sm flex gap-2 items-start">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{submitError}</span>
                </div>
              )}

              {/* Rincian Tagihan */}
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant">
                <div className="font-body-sm text-secondary mb-1">Untuk Tagihan:</div>
                <div className="font-body-md font-bold text-on-surface">{selectedBill.fee_profiles.name}</div>
                <div className="flex justify-between mt-2 font-body-sm">
                  <span className="text-secondary">Total Tagihan</span>
                  <span className="font-bold text-on-surface">Rp {formatRupiah(selectedBill.amount)}</span>
                </div>
              </div>

              {/* Metode */}
              <div>
                <label className="block font-body-sm font-medium text-on-surface mb-2">Metode Transfer Bank</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="Transfer BSI">Bank Syariah Indonesia (BSI) - 7123456789</option>
                  <option value="Transfer Mandiri">Bank Mandiri - 1140012345678</option>
                </select>
              </div>

              {/* Nominal */}
              <div>
                <label className="block font-body-sm font-medium text-on-surface mb-2">Nominal yang Ditransfer</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md font-bold text-secondary">Rp</span>
                  <input
                    type="text"
                    required
                    value={payAmount}
                    onChange={(e) => {
                      // format as number string
                      const val = e.target.value.replace(/\D/g, '')
                      setPayAmount(val)
                    }}
                    placeholder="Contoh: 500000"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md font-bold focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="font-body-xs text-secondary mt-1">Ubah nominal jika Anda ingin menyicil tagihan ini.</div>
              </div>

              {/* Upload Bukti */}
              <div>
                <label className="block font-body-sm font-medium text-on-surface mb-2">Upload Bukti Transfer</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-outline-variant hover:border-primary rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-surface-container-lowest"
                >
                  {proofFile ? (
                    <>
                      <span className="material-symbols-outlined text-[32px] text-primary">check_circle</span>
                      <span className="font-body-sm font-medium text-primary text-center break-all">{proofFile.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[32px] text-secondary">add_photo_alternate</span>
                      <span className="font-body-sm font-medium text-secondary">Ketuk untuk pilih foto resi</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-primary hover:bg-surface-tint text-on-primary rounded-xl font-body-md font-bold shadow-sm transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    Mengirim...
                  </>
                ) : (
                  'Kirim Bukti Pembayaran'
                )}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col items-center text-center p-8">
            <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mb-6 shadow-inner">
              <span className="material-symbols-outlined text-[40px] text-primary">verified</span>
            </div>
            <h3 className="font-headline-sm font-bold text-on-surface mb-2">Pembayaran Terkirim!</h3>
            <p className="font-body-md text-secondary mb-8">
              Bukti transfer Anda telah berhasil diunggah. Silakan tunggu admin memverifikasi pembayaran Anda.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 bg-primary hover:bg-surface-tint text-on-primary rounded-xl font-body-md font-bold shadow-sm transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
