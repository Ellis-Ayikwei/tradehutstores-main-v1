'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSignIn from 'react-auth-kit/hooks/useSignIn'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store'
import { loginUser } from '@/store/authSlice'
import { Apple, Chrome, Facebook, Lock, Mail } from 'lucide-react'
import AuthShell from '../_components/AuthShell'
import { ErrorBanner, PrimaryButton, TextField } from '../_components/fields'

const SOCIAL_PROVIDERS = [
  { label: 'Google', icon: Chrome },
  { label: 'Apple', icon: Apple },
  { label: 'Facebook', icon: Facebook },
]

export default function LoginPage() {
  const signIn = useSignIn()
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')

    const errs: { email?: string; password?: string } = {}
    if (!email.includes('@')) errs.email = 'Enter a valid email address.'
    if (password.length < 1) errs.password = 'Enter your password.'
    if (Object.keys(errs).length > 0) return setErrors(errs)
    setErrors({})

    setLoading(true)
    try {
      await dispatch(
        loginUser({
          email: email.trim(),
          password,
          extra: { signIn },
        })
      ).unwrap()
      router.push('/seller-central')
    } catch (err) {
      setServerError(typeof err === 'string' ? err : 'Incorrect email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heroTitle="Welcome back to TradeHut"
      heroText="Pick up where you left off: track orders, follow live bids and manage your requests in one place."
    >
      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-zinc-900 sm:text-3xl">Sign in</h1>
        <p className="mt-1.5 text-sm text-zinc-600">Use your email and password to access your account.</p>
      </header>

      <form onSubmit={handleLogin} noValidate className="space-y-4">
        {serverError && <ErrorBanner>{serverError}</ErrorBanner>}

        <TextField
          label="Email"
          type="email"
          name="email"
          icon={Mail}
          autoComplete="email"
          inputMode="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
          }}
          error={errors.email}
        />

        <TextField
          label="Password"
          type="password"
          name="password"
          icon={Lock}
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
          }}
          error={errors.password}
          labelAction={
            <Link
              href="/auth/forgot-password"
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary-700 hover:underline"
            >
              Forgot password?
            </Link>
          }
        />

        <PrimaryButton loading={loading} loadingLabel="Signing in…">
          Sign in
        </PrimaryButton>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200" />
        Or continue with
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {SOCIAL_PROVIDERS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            disabled
            title="Coming soon"
            aria-label={`${label} sign-in (coming soon)`}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-100 text-sm font-medium text-zinc-500 cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
          >
            <Icon size={18} aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-zinc-500">Social sign-in is coming soon.</p>

      <p className="mt-8 text-center text-sm text-zinc-700">
        New to TradeHut?{' '}
        <Link
          href="/auth/register"
          className="inline-flex min-h-[44px] items-center font-semibold text-primary-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
