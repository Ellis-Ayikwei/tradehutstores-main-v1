'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, MailCheck } from 'lucide-react'
import AuthShell from '../_components/AuthShell'
import { ErrorBanner, PrimaryButton, SecondaryButton, TextField } from '../_components/fields'
import { parseAuthError, requestPasswordReset } from '@/lib/auth-api'

const RESEND_COOLDOWN_SECONDS = 60
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function BackToSignIn() {
  return (
    <div className="mt-6 flex justify-center">
      <Link
        href="/auth/login"
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to sign in
      </Link>
    </div>
  )
}

/**
 * The backend emails a reset LINK (PasswordRecoveryAPIView), not a code, so this
 * page is just: enter email -> check your inbox. The link opens
 * /auth/reset-password/[uid]/[token], which sets the new password.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const send = async (address: string) => {
    setFormError('')
    setSubmitting(true)
    try {
      await requestPasswordReset(address)
      setSentTo(address)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setFormError(parseAuthError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Stored emails are lowercase and the backend looks them up case-sensitively.
    const value = email.trim().toLowerCase()
    if (!value) {
      setFieldError('Enter your email address.')
      return
    }
    if (!EMAIL_PATTERN.test(value)) {
      setFieldError('Enter a valid email address.')
      return
    }
    setFieldError('')
    void send(value)
  }

  return (
    <AuthShell
      heroTitle="Locked out? We'll get you back in."
      heroText="Reset your password and return to your orders, bids and requests."
    >
      {sentTo ? (
        <div className="text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
            <MailCheck size={30} className="text-primary-700" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-zinc-900 sm:text-3xl">Check your inbox</h1>
          <p className="mx-auto mt-2 max-w-xs break-words text-sm leading-relaxed text-zinc-600">
            If an account exists for <span className="font-semibold text-zinc-900">{sentTo}</span>, we have sent a link
            to reset your password. Check your spam folder if you do not see it.
          </p>

          {formError && (
            <div className="mt-4 text-left">
              <ErrorBanner>{formError}</ErrorBanner>
            </div>
          )}

          <div className="mx-auto mt-6 max-w-sm space-y-3">
            <SecondaryButton disabled={cooldown > 0 || submitting} onClick={() => void send(sentTo)}>
              {submitting ? 'Sending…' : cooldown > 0 ? `Send again in ${cooldown}s` : 'Send the link again'}
            </SecondaryButton>
            <button
              type="button"
              onClick={() => {
                setSentTo('')
                setFormError('')
                setCooldown(0)
              }}
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              Use a different email
            </button>
          </div>

          <BackToSignIn />
        </div>
      ) : (
        <div>
          <header className="mb-6">
            <h1 className="font-display text-2xl font-extrabold text-zinc-900 sm:text-3xl">Reset your password</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
              Enter the email linked to your account and we&apos;ll send you a link to reset your password.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError && <ErrorBanner>{formError}</ErrorBanner>}
            <TextField
              id="fp-email"
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
                if (fieldError) setFieldError('')
              }}
              error={fieldError}
            />
            <PrimaryButton loading={submitting} loadingLabel="Sending…">
              Send reset link
            </PrimaryButton>
          </form>

          <BackToSignIn />
        </div>
      )}
    </AuthShell>
  )
}
