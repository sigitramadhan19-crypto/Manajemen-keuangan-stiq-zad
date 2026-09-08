import { createFileRoute, useRouter } from '@tanstack/react-router'
import React, { useState } from 'react'
import { supabase } from '../lib/api'

export const Route = createFileRoute('/portal')({
  component: PortalLoginComponent,
})

function PortalLoginComponent() {
  const router = useRouter()
  const [nim, setNim] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [step, setStep] = useState<'login' | 'setup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const DEFAULT_PASSWORD = 'STIQZAD123'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const sanitizedNim = nim.replace(/\s+/g, '').trim()
      
      // Cek mahasiswa di database
      const { data: students, error: dbError } = await supabase
        .from('students')
        .select('*')
        .eq('nim', sanitizedNim)
        .limit(1)

      if (dbError) throw dbError
      
      if (!students || students.length === 0) {
        throw new Error('NIM tidak ditemukan di sistem.')
      }

      const student = students[0]

      // Jika belum registrasi password baru
      if (!student.is_registered) {
        if (password !== DEFAULT_PASSWORD) {
          throw new Error('Password salah. Gunakan Password Default yang diberikan kampus.')
        }
        setStep('setup')
        setLoading(false)
        return
      }

      // Login normal, periksa custom password
      if (student.password !== password) {
        throw new Error('Password salah.')
      }

      // Berhasil login
      localStorage.setItem('student_session', JSON.stringify({ nim: student.nim, name: student.name }))
      router.navigate({ to: '/student' })
      
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter.')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      setLoading(false)
      return
    }

    try {
      const sanitizedNim = nim.replace(/\s+/g, '').trim()

      // Update password di tabel mahasiswa secara langsung
      const { error: updateError } = await supabase
        .from('students')
        .update({ is_registered: true, password: newPassword })
        .eq('nim', sanitizedNim)

      if (updateError) throw updateError

      // Berhasil masuk
      const { data: sData } = await supabase.from('students').select('name').eq('nim', sanitizedNim).limit(1)
      
      localStorage.setItem('student_session', JSON.stringify({ nim: sanitizedNim, name: sData?.[0]?.name || '' }))
      router.navigate({ to: '/student' })

    } catch (err: any) {
      setError(err.message || 'Gagal mengatur password. Silakan hubungi admin.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg overflow-hidden bg-white">
            <img src="/logo.png" alt="STIQ ZAD Logo" className="w-full h-full object-contain p-1" />
          </div>
          <h1 className="font-display-sm text-display-sm font-bold text-on-surface">Portal Mahasiswa</h1>
          <p className="font-body-md text-body-md text-secondary mt-2">Sistem Informasi Keuangan ZAD</p>
        </div>

        {/* Form Container */}
        <div className="bg-surface rounded-3xl shadow-sm border border-outline-variant p-6 md:p-8">
          
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl font-body-sm text-body-sm flex gap-3 items-start">
              <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-2">
                  Nomor Induk Mahasiswa (NIM)
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">badge</span>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 220101"
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-body-md"
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">lock</span>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan Password"
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-body-md"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary hover:bg-surface-tint text-on-primary rounded-xl font-body-md font-bold transition-colors disabled:opacity-70 mt-2 shadow-sm"
              >
                {loading ? 'Masuk...' : 'Masuk Portal'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSetup} className="space-y-5">
              <div className="mb-4">
                <div className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">Aktivasi Akun</div>
                <div className="font-body-sm text-body-sm text-secondary">Ini adalah login pertama Anda. Silakan buat password baru yang rahasia.</div>
              </div>

              <div>
                <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-2">
                  Password Baru
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">lock_reset</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-body-md"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-2">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">verified_user</span>
                  <input
                    type="password"
                    required
                    placeholder="Ulangi password baru"
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-body-md"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary hover:bg-surface-tint text-on-primary rounded-xl font-body-md font-bold transition-colors disabled:opacity-70 mt-2 shadow-sm"
              >
                {loading ? 'Memproses...' : 'Simpan & Masuk'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
