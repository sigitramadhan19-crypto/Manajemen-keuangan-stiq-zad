import { createFileRoute, useRouter } from '@tanstack/react-router'
import React, { useState } from 'react'
import { supabase } from '../lib/api'

export const Route = createFileRoute('/login')({
  component: LoginComponent,
})

function LoginComponent() {
  const router = useRouter()
  const search = Route.useSearch() as { redirect?: string }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { auth } = Route.useRouteContext()
  const [error, setError] = useState<string | null>(null)

  // Navigate automatically when user context is updated
  React.useEffect(() => {
    if (auth.user) {
      router.navigate({ to: search.redirect || '/' })
    }
  }, [auth.user, router, search.redirect])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // Note: We don't manually navigate here anymore.
    // The useEffect above will handle it once auth.user updates.
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant p-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center mb-4">
            <span className="material-symbols-outlined fill text-[32px]">account_balance</span>
          </div>
          <h1 className="font-display-sm text-display-sm font-bold text-on-surface">STIQ ZAD</h1>
          <p className="font-body-md text-body-md text-secondary mt-1">Financial Management System</p>
        </div>

        {error && (
          <div className="mb-6 bg-error-container/50 border border-error/30 rounded-lg p-3 text-on-error-container font-body-sm text-body-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
            <span>{error === 'Invalid login credentials' ? 'Email atau password salah.' : error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1" htmlFor="email">
              Email Administrator
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="admin@stiqzad.ac.id"
              className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block font-body-sm text-body-sm font-medium text-on-surface mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 bg-primary hover:bg-surface-tint text-on-primary rounded-lg font-body-md text-body-md font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-outline-variant pt-6">
          <p className="font-body-sm text-body-sm text-secondary">
            Gunakan akun yang telah didaftarkan di Supabase Dashboard untuk masuk.
          </p>
        </div>
      </div>
      <div className="mt-8 font-body-sm text-body-sm text-secondary">
        &copy; {new Date().getFullYear()} STIQ ZAD. All rights reserved.
      </div>
    </div>
  )
}
