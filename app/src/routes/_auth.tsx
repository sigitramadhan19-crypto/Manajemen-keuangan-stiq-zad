import { createFileRoute, Outlet, Link, redirect, useRouter } from '@tanstack/react-router'
import React, { useState } from 'react'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { auth } = Route.useRouteContext()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await auth.signOut()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased overflow-x-hidden min-h-screen">
      {/* SideNavBar */}
      <nav aria-label="Sidebar" className="w-[280px] h-full fixed left-0 top-0 dark:bg-inverse-surface border-r border-outline-variant dark:border-outline flex flex-col py-density-comfortable px-4 z-40 bg-inverse-surface">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-white flex items-center justify-center shadow-sm">
            <img src="/logo.png" alt="STIQ ZAD Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-on-primary">STIQ ZAD</h1>
            <p className="font-body-sm text-body-sm text-on-primary/70">Financial Management</p>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <Link activeProps={{ className: 'bg-primary-container text-on-primary-container font-bold border-r-2 border-primary' }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ease-in-out" inactiveProps={{ className: 'text-on-primary/80 hover:bg-on-primary/10' }} to="/">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </Link>
          <Link activeProps={{ className: 'bg-primary-container text-on-primary-container font-bold border-r-2 border-primary' }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ease-in-out" inactiveProps={{ className: 'text-on-primary/80 hover:bg-on-primary/10' }} to="/mahasiswa">
            <span className="material-symbols-outlined">group</span>
            <span>Mahasiswa</span>
          </Link>
          <Link activeProps={{ className: 'bg-primary-container text-on-primary-container font-bold border-r-2 border-primary' }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ease-in-out" inactiveProps={{ className: 'text-on-primary/80 hover:bg-on-primary/10' }} to="/master-biaya">
            <span className="material-symbols-outlined">payments</span>
            <span>Master Biaya</span>
          </Link>
          <Link activeProps={{ className: 'bg-primary-container text-on-primary-container font-bold border-r-2 border-primary' }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ease-in-out" inactiveProps={{ className: 'text-on-primary/80 hover:bg-on-primary/10' }} to="/tagihan">
            <span className="material-symbols-outlined">receipt_long</span>
            <span>Tagihan</span>
          </Link>
          <Link activeProps={{ className: 'bg-primary-container text-on-primary-container font-bold border-r-2 border-primary' }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ease-in-out" inactiveProps={{ className: 'text-on-primary/80 hover:bg-on-primary/10' }} to="/pembayaran">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span>Transaksi & Persetujuan</span>
          </Link>
          <Link activeProps={{ className: 'bg-primary-container text-on-primary-container font-bold border-r-2 border-primary' }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ease-in-out" inactiveProps={{ className: 'text-on-primary/80 hover:bg-on-primary/10' }} to="/laporan">
            <span className="material-symbols-outlined">assessment</span>
            <span>Laporan</span>
          </Link>
        </div>
      </nav>

      {/* TopAppBar */}
      <header className="fixed top-0 right-0 h-16 ml-[280px] w-[calc(100%-280px)] bg-surface dark:bg-inverse-surface border-b border-outline-variant dark:border-outline flex justify-between items-center px-container-padding z-30">
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6">
            <a className="text-primary dark:text-primary-fixed-dim font-bold border-b-2 border-primary pb-1 font-body-md text-body-md cursor-pointer transition-all" href="/">Overview</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-secondary font-body-sm text-body-sm bg-surface-container px-3 py-1 rounded-full border border-outline-variant hidden md:block">Role: Admin</span>
          <button className="p-2 text-secondary hover:text-primary rounded-full hover:bg-surface-container transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          
          {/* User Menu */}
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant flex items-center justify-center bg-secondary-container text-on-secondary-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>
            
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant py-1 z-50">
                  <div className="px-4 py-2 border-b border-outline-variant mb-1">
                    <p className="font-body-sm text-body-sm font-medium truncate">{auth.user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full text-left px-4 py-2 font-body-sm text-body-sm text-error hover:bg-error-container/50 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    {isLoggingOut ? 'Keluar...' : 'Keluar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="ml-[280px] mt-16 p-container-padding min-h-screen bg-background">
        <Outlet />
      </main>
    </div>
  )
}
