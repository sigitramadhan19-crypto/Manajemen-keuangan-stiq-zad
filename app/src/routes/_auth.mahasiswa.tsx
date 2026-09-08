import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useRef, useEffect } from 'react'
import { useStudents, useFeeProfiles, useDebounce } from '../lib/hooks'
import { createStudent, updateStudent, deleteStudent, createStudentsBulk, getBills, createBill, formatRupiah } from '../lib/api'
import { parseStudentExcel, downloadExcelTemplate } from '../lib/excel'
import type { Student, StudentInsert, StudentProgram, StudentStatus } from '../lib/database.types'

export const Route = createFileRoute('/_auth/mahasiswa')({
  component: MahasiswaComponent,
})

function MahasiswaComponent() {
  // Filter states
  const [searchInput, setSearchInput] = useState('')
  const [selectedProgram, setSelectedProgram] = useState<StudentProgram | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus | ''>('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const debouncedSearch = useDebounce(searchInput, 400)

  const { students, totalCount, loading, error, refetch } = useStudents({
    search: debouncedSearch,
    program: selectedProgram,
    status: selectedStatus,
    page: currentPage,
    pageSize,
  })

  const { feeProfiles } = useFeeProfiles()
  const totalPages = Math.ceil(totalCount / pageSize)

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isResignOpen, setIsResignOpen] = useState(false)
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [resigningStudent, setResigningStudent] = useState<Student | null>(null)

  const openCreateModal = () => {
    setEditingStudent(null)
    setIsModalOpen(true)
  }

  const openEditModal = (student: Student) => {
    setEditingStudent(student)
    setIsModalOpen(true)
  }

  const openDeleteModal = (student: Student) => {
    setDeletingStudent(student)
    setIsDeleteOpen(true)
  }

  const openResignModal = (student: Student) => {
    setResigningStudent(student)
    setIsResignOpen(true)
  }

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Data Mahasiswa</h2>
          <p className="font-body-sm text-body-sm text-secondary">Kelola data mahasiswa, program, dan status keaktifan.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant bg-surface hover:bg-surface-container text-on-surface rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            Import Data
          </button>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-surface-tint text-on-primary rounded-lg font-body-md text-body-md font-medium transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Tambah Mahasiswa
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

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="px-6 py-4 bg-surface flex flex-wrap gap-3 border-b border-outline-variant items-center">
          <div className="relative flex-grow max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
            <input
              className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container-lowest"
              placeholder="Cari Nama atau NIM..."
              type="text"
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setCurrentPage(1) }}
            />
          </div>
          <select
            className="px-3 py-2 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedProgram}
            onChange={e => { setSelectedProgram(e.target.value as StudentProgram | ''); setCurrentPage(1) }}
          >
            <option value="">Semua Program</option>
            <option value="Reguler Asrama">Reguler Asrama</option>
            <option value="Non-Asrama">Non-Asrama</option>
            <option value="Beasiswa">Beasiswa</option>
          </select>
          <select
            className="px-3 py-2 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value as StudentStatus | ''); setCurrentPage(1) }}
          >
            <option value="">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Cuti">Cuti</option>
            <option value="Lulus">Lulus</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">NIM & Nama</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Program</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider">Angkatan</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 font-label-caps text-label-caps text-secondary uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-32" /><div className="h-3 bg-surface-container rounded w-20 mt-1" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-surface-container rounded w-12" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-5 bg-surface-container rounded-full w-14 mx-auto" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-container rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline mb-2 block">person_off</span>
                    <div className="font-body-md text-body-md text-secondary">
                      {debouncedSearch || selectedProgram || selectedStatus
                        ? 'Tidak ada mahasiswa yang cocok dengan filter.'
                        : 'Belum ada data mahasiswa.'}
                    </div>
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-body-md text-body-md font-medium text-on-surface">{student.name}</div>
                      <div className="font-financial-data text-financial-data text-secondary text-xs">{student.nim}</div>
                    </td>
                    <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface">{student.program}</td>
                    <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface">{student.year}</td>
                    <td className="px-4 py-3 text-center">
                      <StudentStatusBadge status={student.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {student.status !== 'Keluar' && student.status !== 'Lulus' && (
                        <button onClick={() => openResignModal(student)} className="text-error hover:text-error/80 font-body-sm text-body-sm font-medium mr-3">Mutasi</button>
                      )}
                      <button onClick={() => openEditModal(student)} className="text-primary hover:text-surface-tint font-body-sm text-body-sm font-medium mr-3">Edit</button>
                      <button onClick={() => openDeleteModal(student)} className="text-error hover:text-error/80 font-body-sm text-body-sm font-medium">Hapus</button>
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
            {loading ? '...' : `Menampilkan ${totalCount === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, totalCount)} dari ${totalCount}`}
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

      {/* Modals */}
      {isModalOpen && (
        <StudentModal 
          student={editingStudent} 
          feeProfiles={feeProfiles}
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => { setIsModalOpen(false); refetch() }} 
        />
      )}
      {isDeleteOpen && deletingStudent && (
        <DeleteModal 
          student={deletingStudent} 
          onClose={() => setIsDeleteOpen(false)} 
          onSuccess={() => { setIsDeleteOpen(false); refetch() }} 
        />
      )}
      {isResignOpen && resigningStudent && (
        <ResignModal
          student={resigningStudent}
          onClose={() => setIsResignOpen(false)}
          onSuccess={() => { setIsResignOpen(false); refetch() }}
        />
      )}
      {isImportOpen && (
        <ImportModal 
          onClose={() => setIsImportOpen(false)} 
          onSuccess={() => { setIsImportOpen(false); refetch() }} 
        />
      )}
    </>
  )
}

function StudentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    'Aktif': { bg: 'bg-primary-container', text: 'text-on-primary-container' },
    'Cuti': { bg: 'bg-surface-container-highest', text: 'text-on-surface' },
    'Lulus': { bg: 'bg-secondary-container', text: 'text-on-secondary-container' },
  }
  const c = config[status] ?? { bg: 'bg-surface-container-highest', text: 'text-on-surface' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {status}
    </span>
  )
}

// ==========================================
// Modals
// ==========================================

function StudentModal({ 
  student, 
  feeProfiles,
  onClose, 
  onSuccess 
}: { 
  student: Student | null, 
  feeProfiles: any[],
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const isEdit = !!student
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [nim, setNim] = useState(student?.nim || '')
  const [name, setName] = useState(student?.name || '')
  const [email, setEmail] = useState(student?.email || '')
  const [whatsapp, setWhatsapp] = useState(student?.whatsapp || '')
  const [program, setProgram] = useState<StudentProgram>(student?.program || 'Reguler Asrama')
  const [year, setYear] = useState(student?.year || new Date().getFullYear())
  const [status, setStatus] = useState<StudentStatus>(student?.status || 'Aktif')
  const [enrollmentDate, setEnrollmentDate] = useState(student?.enrollment_date || new Date().toISOString().split('T')[0])
  const [feeProfileId, setFeeProfileId] = useState(student?.fee_profile_id || '')

  // Auto-select fee profile based on program when program changes (only if it's a new student or explicitly changed)
  useEffect(() => {
    if (program === 'Reguler Asrama') {
      const asramaProfile = feeProfiles.find(f => f.name.toLowerCase().includes('asrama') && !f.name.toLowerCase().includes('non'))
      if (asramaProfile) setFeeProfileId(asramaProfile.id)
    } else if (program === 'Non-Asrama') {
      const nonAsramaProfile = feeProfiles.find(f => f.name.toLowerCase().includes('non-asrama') || f.name.toLowerCase().includes('non asrama'))
      if (nonAsramaProfile) setFeeProfileId(nonAsramaProfile.id)
    } else if (program === 'Beasiswa') {
      setFeeProfileId('') // Beasiswa typically doesn't have a monthly default SPP profile in the same way
    }
  }, [program, feeProfiles])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const finalEmail = email.trim() || `mhs${nim}@stiqzad.ac.id`
      
      if (isEdit) {
        await updateStudent(student.id, {
          nim, name, email: finalEmail, whatsapp, program, year, status, enrollment_date: enrollmentDate, fee_profile_id: feeProfileId || null
        })
      } else {
        await createStudent({
          nim, name, email: finalEmail, whatsapp, program, year, status, enrollment_date: enrollmentDate, fee_profile_id: feeProfileId || null
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
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            {isEdit ? 'Edit Mahasiswa' : 'Tambah Mahasiswa'}
          </h3>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">NIM</label>
              <input type="text" required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={nim} onChange={e => setNim(e.target.value)} />
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Nama Lengkap</label>
              <input type="text" required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">
                Email (Kosongkan = Auto-Generate)
              </label>
              <input type="email" placeholder={`mhs${nim || 'nim'}@stiqzad.ac.id`} className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">WhatsApp</label>
              <input type="text" className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Program Studi</label>
              <select className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={program} onChange={e => setProgram(e.target.value as StudentProgram)}>
                <option value="Reguler Asrama">Reguler Asrama</option>
                <option value="Non-Asrama">Non-Asrama</option>
                <option value="Beasiswa">Beasiswa</option>
              </select>
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Tahun Angkatan</label>
              <input type="number" required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={year} onChange={e => setYear(Number(e.target.value))} />
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Bulan Masuk (Mulai Kuliah)</label>
              <input type="date" required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={enrollmentDate} onChange={e => setEnrollmentDate(e.target.value)} />
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Status</label>
              <select className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={status} onChange={e => setStatus(e.target.value as StudentStatus)}>
                <option value="Aktif">Aktif</option>
                <option value="Cuti">Cuti</option>
                <option value="Lulus">Lulus</option>
              </select>
            </div>
            <div>
              <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">Profil Biaya (Default)</label>
              <select className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary" value={feeProfileId} onChange={e => setFeeProfileId(e.target.value)}>
                <option value="">-- Pilih Profil Biaya --</option>
                {feeProfiles.map(fp => (
                  <option key={fp.id} value={fp.id}>{fp.name}</option>
                ))}
              </select>
            </div>
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

function DeleteModal({ student, onClose, onSuccess }: { student: Student, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      await deleteStudent(student.id)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus data. Pastikan tidak ada tagihan terkait.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-error-container text-error rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[24px]">warning</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Hapus Mahasiswa?</h3>
        <p className="font-body-sm text-body-sm text-secondary mb-6">
          Anda yakin ingin menghapus <strong>{student.name}</strong> ({student.nim})? Data yang sudah dihapus tidak dapat dikembalikan.
        </p>
        {error && <div className="mb-4 text-error font-body-sm text-body-sm">{error}</div>}
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

function ImportModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ valid: any[], errors: string[] } | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setLoading(true)
    setError(null)
    setPreview(null)
    
    try {
      const result = await parseStudentExcel(selected)
      setPreview(result)
    } catch (err: any) {
      setError(err.message || 'Gagal membaca file Excel.')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!preview || preview.valid.length === 0) return
    setLoading(true)
    setError(null)
    
    try {
      const inserts: StudentInsert[] = preview.valid.map(v => ({
        nim: v.NIM,
        name: v.Name,
        email: v.Email,
        whatsapp: v.WhatsApp,
        program: v.Program as StudentProgram,
        year: v.Year,
        status: 'Aktif',
        fee_profile_id: v.FeeProfile || null
      }))
      
      await createStudentsBulk(inserts)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data ke database.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Import Data Mahasiswa</h3>
          <button onClick={onClose} className="text-secondary hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-center bg-primary-container/30 p-4 rounded-xl border border-primary-container">
            <div>
              <div className="font-body-md text-body-md font-medium text-on-surface">Template Excel</div>
              <div className="font-body-sm text-body-sm text-secondary mt-1">Gunakan template ini agar format data sesuai dengan sistem.</div>
            </div>
            <button 
              onClick={downloadExcelTemplate}
              className="px-4 py-2 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg font-body-sm text-body-sm font-medium transition-colors flex gap-2 items-center"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download Template
            </button>
          </div>

          <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 text-center bg-surface-container-lowest hover:bg-surface-container/50 transition-colors relative">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span className="material-symbols-outlined text-[48px] text-outline mb-2">upload_file</span>
            <div className="font-body-md text-body-md font-medium text-on-surface">
              {file ? file.name : 'Pilih file Excel atau drag & drop ke sini'}
            </div>
            <div className="font-body-sm text-body-sm text-secondary mt-1">Hanya mendukung format .xlsx atau .xls</div>
          </div>

          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm flex gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {loading && !file && (
            <div className="text-center p-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <div className="font-body-sm text-body-sm text-secondary">Memproses file...</div>
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              <h4 className="font-body-md text-body-md font-medium text-on-surface">Hasil Validasi</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface-container rounded-xl border border-outline-variant text-center">
                  <div className="font-display-sm text-display-sm font-medium text-primary">{preview.valid.length}</div>
                  <div className="font-body-sm text-body-sm text-secondary">Data Valid</div>
                </div>
                <div className="p-4 bg-surface-container rounded-xl border border-outline-variant text-center">
                  <div className={`font-display-sm text-display-sm font-medium ${preview.errors.length > 0 ? 'text-error' : 'text-on-surface'}`}>
                    {preview.errors.length}
                  </div>
                  <div className="font-body-sm text-body-sm text-secondary">Data Error</div>
                </div>
              </div>
              
              {preview.errors.length > 0 && (
                <div className="bg-error-container/20 border border-error-container p-4 rounded-xl max-h-40 overflow-y-auto">
                  <ul className="list-disc pl-4 space-y-1">
                    {preview.errors.map((err, i) => (
                      <li key={i} className="font-body-sm text-body-sm text-error">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-outline-variant bg-surface flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 font-body-md text-body-md font-medium text-secondary hover:bg-surface-container rounded-lg">Batal</button>
          <button 
            onClick={handleImport}
            disabled={loading || !preview || preview.valid.length === 0} 
            className="px-4 py-2 font-body-md text-body-md font-medium bg-primary text-on-primary hover:bg-surface-tint rounded-lg disabled:opacity-70 flex gap-2 items-center"
          >
            {loading ? 'Menyimpan...' : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Import {preview?.valid.length || 0} Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResignModal({ student, onClose, onSuccess }: { student: Student, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [unpaidBills, setUnpaidBills] = useState<any[]>([])
  const [billsLoading, setBillsLoading] = useState(true)

  const calculateDefaultMonths = () => {
    if (!student.enrollment_date) return 1
    const start = new Date(student.enrollment_date)
    const now = new Date()
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    return Math.max(1, months) // Minimum 1 bulan
  }
  
  const [activeMonths, setActiveMonths] = useState(calculateDefaultMonths())

  useEffect(() => {
    let cancelled = false
    const fetchBills = async () => {
      try {
        const { data } = await getBills({ studentId: student.id })
        if (!cancelled) {
          setUnpaidBills(data.filter(b => b.status !== 'lunas'))
        }
      } catch (err: any) {
        if (!cancelled) setError('Gagal mengambil data tunggakan berjalan.')
      } finally {
        if (!cancelled) setBillsLoading(false)
      }
    }
    fetchBills()
    return () => { cancelled = true }
  }, [student.id])

  const penaltyRate = student.program === 'Beasiswa' ? 1600000 : 500000
  const penaltyTotal = penaltyRate * activeMonths
  const unpaidTotal = unpaidBills.reduce((sum, b) => sum + b.amount, 0)
  const grandTotal = penaltyTotal + unpaidTotal

  const handleResign = async () => {
    if (!window.confirm(`Proses mutasi untuk ${student.name}? Tindakan ini akan membuat tagihan denda dan mengubah status mahasiswa menjadi Keluar.`)) return
    
    setLoading(true)
    setError(null)
    try {
      const timestamp = new Date().getTime()
      await createBill({
        invoice_number: `RESIGN-${student.nim}-${timestamp}`,
        student_id: student.id,
        period: 'Mutasi',
        due_date: new Date().toISOString().split('T')[0],
        amount: penaltyTotal,
        status: 'belum bayar',
        fee_profile_id: null
      })
      
      await updateStudent(student.id, { status: 'Keluar' })
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Gagal memproses mutasi.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface text-error">
          <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined">exit_to_app</span>
            Mutasi Mahasiswa
          </h3>
          <button onClick={onClose} className="text-secondary hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm flex gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}
          
          <div className="bg-surface-container rounded-lg p-4">
            <div className="font-body-md text-body-md font-bold text-on-surface">{student.name} ({student.nim})</div>
            <div className="font-body-sm text-body-sm text-secondary">Program: {student.program}</div>
            <div className="font-body-sm text-body-sm text-secondary">Bulan Masuk: {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'}</div>
          </div>

          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1">
              Bulan Aktif Kuliah (Bisa dikurangi jika cuti)
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="0" 
                className="w-24 px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary text-center font-bold" 
                value={activeMonths} 
                onChange={e => setActiveMonths(Number(e.target.value))} 
              />
              <span className="font-body-sm text-body-sm text-secondary">Bulan</span>
            </div>
          </div>

          <div className="space-y-3 border border-outline-variant rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="font-body-sm text-body-sm text-secondary">Total Denda ({activeMonths} x Rp {formatRupiah(penaltyRate)})</span>
              <span className="font-body-md text-body-md font-medium">Rp {formatRupiah(penaltyTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-body-sm text-body-sm text-secondary">Tunggakan SPP Berjalan ({billsLoading ? '...' : unpaidBills.length} Tagihan)</span>
              <span className="font-body-md text-body-md font-medium">Rp {formatRupiah(unpaidTotal)}</span>
            </div>
            <div className="pt-3 border-t border-outline-variant flex justify-between items-center text-error">
              <span className="font-body-md text-body-md font-bold">Grand Total Final</span>
              <span className="font-headline-sm text-headline-sm font-bold">Rp {formatRupiah(grandTotal)}</span>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-outline-variant bg-surface flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 font-body-md text-body-md font-medium text-secondary hover:bg-surface-container rounded-lg">Batal</button>
          <button 
            onClick={handleResign}
            disabled={loading || billsLoading} 
            className="px-4 py-2 font-body-md text-body-md font-medium bg-error text-on-error hover:bg-error/90 rounded-lg disabled:opacity-70 flex gap-2 items-center"
          >
            {loading ? 'Memproses...' : 'Ubah Status & Buat Tagihan'}
          </button>
        </div>
      </div>
    </div>
  )
}
