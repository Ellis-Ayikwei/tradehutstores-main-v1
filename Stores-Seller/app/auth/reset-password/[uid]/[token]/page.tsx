'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, Lock } from 'lucide-react'
import AuthShell from '../../../_components/AuthShell'
import { ErrorBanner, PrimaryButton, TextField } from '../../../_components/fields'
import { confirmPasswordReset, parseAuthError } from '@/lib/auth-api'

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak', color: 'bg-red-500' },
    2: { label: 'Fair', color: 'bg-amber-500' },
    3: { label: 'Good', color: 'bg-emerald-500' },
    4: { label: 'Strong', color: 'bg-emerald-600' },
  }
  return { score, ...(map[score] ?? { label: '', color: '' }) }
}

const asString = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default function ResetPasswordPage() {
  const params = useParams<{ uid: string; token: string }>()
  const uid = asString(params?.uid)
  const token = asString(params?.token)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [linkInvalid, setLinkInvalid] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const strength = getStrength(password)
  const mismatch = confirm.length > 0 && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFieldError('')
    if (!password) {
      setFieldError('Enter a new password.')
      return
    }
    if (password.length < 8) {
      setFieldError('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await confirmPasswordReset(uid, token, password)
      setDone(true)
    } catch (err) {
      const parsed = parseAuthError(err)
      if (parsed.fields.password) {
        // validate_password rejection (too common, numeric only, similar to your details, ...)
        setFieldError(parsed.fields.password)
      } else if (parsed.status === 400) {
        // { detail: 'Invalid token.' } or a missing/garbled uid/token
        setLinkInvalid(true)
      } else {
        setFormError(parsed.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      heroTitle="Choose a new password"
      heroText="Set a new password and return to your orders, bids and requests."
    >
      {done ? (
        <div className="text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle size={32} className="text-emerald-600" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-zinc-900 sm:text-3xl">Password updated</h1>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-zinc-600">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <Link
            href="/auth/login"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-base font-bold text-zinc-900 transition-colors hover:bg-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
          >
            Go to sign in
          </Link>
        </div>
      ) : linkInvalid || !uid || !token ? (
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold text-zinc-900 sm:text-3xl">This link is not valid</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-600">
            The reset link is invalid, has expired or was already used. Request a new one to continue.
          </p>
          <Link
            href="/auth/forgot-password"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-base font-bold text-zinc-900 transition-colors hover:bg-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
          >
            Request a new link
          </Link>
        </div>
      ) : (
        <div>
          <header className="mb-6">
            <h1 className="font-display text-2xl font-extrabold text-zinc-900 sm:text-3xl">Create new password</h1>
            <p className="mt-1.5 text-sm text-zinc-600">Choose a strong password you don&apos;t use anywhere else.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError && <ErrorBanner>{formError}</ErrorBanner>}

            <div>
              <TextField
                id="rp-new-pw"
                label="New password"
                type="password"
                icon={Lock}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldError) setFieldError('')
                }}
                error={fieldError}
              />
              {password.length > 0 && (
                <div className="mt-3">
                  <div className="flex h-1.5 gap-1" aria-hidden>
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className={`h-full flex-1 rounded-full transition-colors ${
                          n <= strength.score ? strength.color : 'bg-zinc-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-zinc-700" aria-live="polite">
                    Password strength: {strength.label}
                  </p>
                </div>
              )}
            </div>

            <TextField
              id="rp-confirm-pw"
              label="Confirm new password"
              type="password"
              icon={Lock}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={mismatch ? 'Passwords do not match.' : undefined}
              hint={confirm.length > 0 && !mismatch ? 'Passwords match.' : undefined}
            />

            <PrimaryButton loading={submitting} loadingLabel="Saving…">
              Reset password
            </PrimaryButton>
          </form>

          <div className="mt-6 flex justify-center">
            <Link
              href="/auth/login"
              className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              <ArrowLeft size={16} aria-hidden />
              Back to sign in
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
