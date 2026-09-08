import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useFeeProfiles } from '../lib/hooks'
import { formatRupiah } from '../lib/api'
import { createFeeProfile, updateFeeProfile, deleteFeeProfile } from '../lib/api'
import type { FeeProfile, FeeCategory } from '../lib/database.types'

export const Route = createFileRoute('/_auth/master-biaya')({
  component: MasterBiayaComponent,
})

function MasterBiayaComponent() {
  const { feeProfiles, loading, error, refetch } = useFeeProfiles()

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<FeeProfile | null>(null)
  const [deletingProfile, setDeletingProfile] = useState<FeeProfile | null>(null)

  const openCreateModal = () => {
    setEditingProfile(null)
    setIsModalOpen(true)
  }

  const openEditModal = (profile: FeeProfile) => {
    setEditingProfile(profile)
    setIsModalOpen(true)
  }

  const openDeleteModal = (profile: FeeProfile) => {
    setDeletingProfile(profile)
    setIsDeleteOpen(true)
  }

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Master Biaya</h2>
          <p className="font-body-sm text-body-sm text-secondary">Kelola daftar komponen biaya, nominal default, dan kategori.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-surface-tint text-on-primary rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined">add</span>
          Tambah Biaya Baru
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Daftar Komponen Biaya</h3>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface">
                    <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Nama Biaya</th>
                    <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Kategori</th>
                    <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Nominal (Rp)</th>
                    <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-center">Status</th>
                    <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={`skeleton-${i}`} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-32" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-20" /></td>
                        <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-24 ml-auto" /></td>
                        <td className="px-4 py-3 text-center"><div className="h-5 bg-surface-container rounded-full w-12 mx-auto" /></td>
                        <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-10 ml-auto" /></td>
                      </tr>
                    ))
                  ) : feeProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <span className="material-symbols-outlined text-[48px] text-outline mb-2 block">payments</span>
                        <div className="font-body-md text-body-md text-secondary">Belum ada komponen biaya.</div>
                      </td>
                    </tr>
                  ) : (
                    feeProfiles.map(fp => (
                      <tr key={fp.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-4 py-3 font-body-md text-body-md font-medium text-on-surface">{fp.name}</td>
                        <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface">{fp.category}</td>
                        <td className="px-4 py-3 font-financial-data text-financial-data text-on-surface text-right tabular-nums">{formatRupiah(fp.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${fp.is_active ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-surface'}`}>
                            {fp.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => openEditModal(fp)} className="text-primary hover:text-surface-tint font-body-sm text-body-sm font-medium mr-3">Edit</button>
                          <button onClick={() => openDeleteModal(fp)} className="text-error hover:text-error/80 font-body-sm text-body-sm font-medium">Hapus</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div>
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden p-6 sticky top-24">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">Informasi Kategori Biaya</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </div>
                <div>
                  <h4 className="font-body-md text-body-md font-medium text-on-surface">Bulanan</h4>
                  <p className="font-body-sm text-body-sm text-secondary">Tagihan rutin yang di-generate setiap awal bulan (misal: SPP).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">today</span>
                </div>
                <div>
                  <h4 className="font-body-md text-body-md font-medium text-on-surface">Tahunan</h4>
                  <p className="font-body-sm text-body-sm text-secondary">Tagihan yang muncul di awal semester atau tahun ajaran baru.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">looks_one</span>
                </div>
                <div>
                  <h4 className="font-body-md text-body-md font-medium text-on-surface">Sekali Bayar</h4>
                  <p className="font-body-sm text-body-sm text-secondary">Tagihan yang hanya dikenakan satu kali selama masa studi (misal: Uang Pangkal).</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <FeeProfileModal 
          profile={editingProfile}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => { setIsModalOpen(false); refetch() }}
        />
      )}
      {isDeleteOpen && deletingProfile && (
        <DeleteModal 
          profile={deletingProfile}
          onClose={() => setIsDeleteOpen(false)}
          onSuccess={() => { setIsDeleteOpen(false); refetch() }}
        />
      )}
    </>
  )
}

// ==========================================
// Modals
// ==========================================

function FeeProfileModal({ 
  profile, 
  onClose, 
  onSuccess 
}: { 
  profile: FeeProfile | null, 
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const isEdit = !!profile
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState(profile?.name || '')
  const [category, setCategory] = useState<FeeCategory>(profile?.category || 'Bulanan')
  const [amount, setAmount] = useState(profile?.amount?.toString() || '')
  const [isActive, setIsActive] = useState(profile ? profile.is_active : true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const parsedAmount = parseInt(amount.replace(/\D/g, ''), 10)
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error('Nominal tidak valid')
      }

      if (isEdit) {
        await updateFeeProfile(profile.id, {
          name, category, amount: parsedAmount, is_active: isActive
        })
      } else {
        await createFeeProfile({
          name, category, amount: parsedAmount, is_active: isActive
        })
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            {isEdit ? 'Edit Komponen Biaya' : 'Tambah Biaya Baru'}
          </h3>
          <button onClick={onClose} className="text-secondary hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm flex gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}
          
          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Nama Biaya</label>
            <input type="text" required placeholder="Contoh: SPP Bulanan" className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Kategori</label>
            <select className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={category} onChange={e => setCategory(e.target.value as FeeCategory)}>
              <option value="Bulanan">Bulanan</option>
              <option value="Tahunan">Tahunan</option>
              <option value="Sekali Bayar">Sekali Bayar</option>
            </select>
          </div>
          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Nominal (Rp)</label>
            <input type="number" required placeholder="Contoh: 1500000" className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary font-financial-data tabular-nums" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative inline-block w-10 h-6">
                <input type="checkbox" className="peer sr-only" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                <div className="block w-10 h-6 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors"></div>
                <div className="dot absolute left-1 top-1 bg-surface-container-lowest w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
              </div>
              <div>
                <div className="font-body-md text-body-md font-medium text-on-surface">Status Aktif</div>
                <div className="font-body-sm text-body-sm text-secondary leading-tight">Biaya yang aktif dapat digunakan untuk tagihan.</div>
              </div>
            </label>
          </div>
          
          <div className="mt-8 pt-4 border-t border-outline-variant flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 font-body-md text-body-md font-medium text-secondary hover:bg-surface-container rounded-lg">Batal</button>
            <button type="submit" disabled={loading} className="px-4 py-2 font-body-md text-body-md font-medium bg-primary text-on-primary hover:bg-surface-tint rounded-lg disabled:opacity-70">
              {loading ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteModal({ profile, onClose, onSuccess }: { profile: FeeProfile, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      await deleteFeeProfile(profile.id)
      onSuccess()
    } catch (err: any) {
      if (err.code === '23503') { // Foreign key constraint violation
        setError('Gagal menghapus! Komponen biaya ini sudah pernah digunakan dalam tagihan. Anda dapat menonaktifkannya dari menu Edit.')
      } else {
        setError(err.message || 'Gagal menghapus komponen biaya.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-error-container text-error rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[24px]">warning</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Hapus Komponen Biaya?</h3>
        <p className="font-body-sm text-body-sm text-secondary mb-6">
          Anda yakin ingin menghapus <strong>{profile.name}</strong>? 
          <br /><br />
          <span className="text-error font-medium">Perhatian:</span> Penghapusan akan gagal jika biaya ini pernah ditagihkan. Pertimbangkan untuk menonaktifkan via tombol Edit saja.
        </p>
        {error && <div className="mb-4 text-error font-body-sm text-body-sm p-3 bg-error-container/30 rounded-lg text-left leading-relaxed">{error}</div>}
        <div className="flex justify-center gap-3">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 font-body-md text-body-md font-medium text-secondary hover:bg-surface-container rounded-lg">Batal</button>
          <button onClick={handleDelete} disabled={loading} className="px-4 py-2 font-body-md text-body-md font-medium bg-error text-on-error hover:bg-error/90 rounded-lg disabled:opacity-70">
            {loading ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}
