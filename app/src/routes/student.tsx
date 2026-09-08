import { createFileRoute, Outlet, useRouter, Link } from '@tanstack/react-router'
import React, { useEffect, useState, createContext, useContext } from 'react'
import { supabase } from '../lib/api'
import type { Student } from '../lib/database.types'

export const Route = createFileRoute('/student')({
  component: StudentLayout,
})

export const StudentContext = createContext<{student: Student | null}>({ student: null })

function StudentLayout() {
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      try {
        const sessionStr = localStorage.getItem('student_session')
        if (!sessionStr) {
          if (!cancelled) router.navigate({ to: '/portal' })
          return
        }

        const session = JSON.parse(sessionStr)
        if (!session.nim) throw new Error('Invalid session')

        // Cari data mahasiswa berdasarkan NIM
        const { data: students, error } = await supabase
          .from('students')
          .select('*')
          .eq('nim', session.nim)
          .limit(1)

        if (error) throw error
        if (!students || students.length === 0) {
          localStorage.removeItem('student_session')
          if (!cancelled) router.navigate({ to: '/portal' })
          return
        }

        if (!cancelled) {
          setStudent(students[0])
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth error:', err)
        if (!cancelled) {
          localStorage.removeItem('student_session')
          router.navigate({ to: '/portal' })
        }
      }
    }

    checkAuth()
    return () => { cancelled = true }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('student_session')
    router.navigate({ to: '/portal' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface flex flex-col font-sans max-w-md mx-auto shadow-2xl relative">
      
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div>
            <div className="font-body-sm text-body-sm font-bold truncate max-w-[200px]">{student?.name}</div>
            <div className="font-body-xs text-xs text-secondary">{student?.nim}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="text-error hover:bg-error-container/20 p-2 rounded-full transition-colors">
          <span className="material-symbols-outlined text-[24px]">logout</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <StudentContext.Provider value={{ student }}>
          <Outlet />
        </StudentContext.Provider>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface border-t border-outline-variant flex justify-around items-center px-2 py-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
        <Link 
          to="/student" 
          activeProps={{ className: 'text-primary font-bold' }}
          inactiveProps={{ className: 'text-secondary hover:text-on-surface' }}
          className="flex flex-col items-center p-2 min-w-[64px] transition-colors"
          activeOptions={{ exact: true }}
        >
          <span className="material-symbols-outlined mb-1">dashboard</span>
          <span className="text-[10px] uppercase tracking-wider">Beranda</span>
        </Link>
        <Link 
          to="/student/tagihan" 
          activeProps={{ className: 'text-primary font-bold' }}
          inactiveProps={{ className: 'text-secondary hover:text-on-surface' }}
          className="flex flex-col items-center p-2 min-w-[64px] transition-colors"
        >
          <span className="material-symbols-outlined mb-1">receipt_long</span>
          <span className="text-[10px] uppercase tracking-wider">Tagihan</span>
        </Link>
        <Link 
          to="/student/riwayat" 
          activeProps={{ className: 'text-primary font-bold' }}
          inactiveProps={{ className: 'text-secondary hover:text-on-surface' }}
          className="flex flex-col items-center p-2 min-w-[64px] transition-colors"
        >
          <span className="material-symbols-outlined mb-1">history</span>
          <span className="text-[10px] uppercase tracking-wider">Riwayat</span>
        </Link>
      </nav>
      
    </div>
  )
}
