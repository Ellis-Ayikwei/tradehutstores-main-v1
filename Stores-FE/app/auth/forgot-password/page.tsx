'use client'

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react'
import Link from 'next/link'
import { AtSign, ArrowLeft, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

// TODO: POST /api/auth/password-reset/request/   — Step 1 (email submission)
// TODO: POST /api/auth/password-reset/verify-otp/ — Step 2 (OTP verification)
// TODO: POST /api/auth/password-reset/confirm/    — Step 3 (new password set)

type Step = 0 | 1 | 2 | 3

// ─── Password-strength helpers ───────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak', color: 'bg-error' },
    2: { label: 'Fair', color: 'bg-bid-amber' },
    3: { label: 'Good', color: 'bg-bid-green' },
    4: { label: 'Strong', color: 'bg-bid-green' },
  }
  return { score, ...(map[score] ?? { label: '', color: '' }) }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Decorative ambient glow blobs — same visual language across all three steps */
function AmbientBlobs() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary opacity-20 blur-[120px]" />
      <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-secondary-green opacity-20 blur-[100px]" />
    </div>
  )
}

/** Step progress bar — thin gradient line at bottom of card */
function StepBar({ step }: { step: Step }) {
  const widths = ['w-1/3', 'w-2/3', 'w-full', 'w-full']
  return (
    <div className="h-1 w-full bg-outline-variant/20 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500 ${widths[step]}`}
      />
    </div>
  )
}

// ─── Step 1: Email request ────────────────────────────────────────────────────
function StepEmail({ onNext }: { onNext: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address.'); return }
    setSubmitting(true)
    try {
      // TODO: POST /api/auth/password-reset/request/ with { email }
      await new Promise((r) => setTimeout(r, 600)) // stub
      onNext(email)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-7 sm:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
          Reset your password
        </h2>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-2 group">
          <label
            htmlFor="fp-email"
            className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant/70"
          >
            Email Address
          </label>
          <div className="relative">
            <input
              id="fp-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none text-sm"
            />
            <AtSign
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/30 group-focus-within:text-primary transition-colors"
              aria-hidden
            />
          </div>
          {error && (
            <p className="text-error text-xs font-medium mt-1">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all duration-200 hover:brightness-110 disabled:opacity-60 disabled:pointer-events-none"
        >
          {submitting ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      {/* Back link */}
      <div className="pt-2 flex flex-col items-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-[18px] h-[18px] group-hover:-translate-x-1 transition-transform" aria-hidden />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

// ─── Step 2: Email-sent confirmation + OTP ────────────────────────────────────
const OTP_LENGTH = 6

function StepOtp({ email, onNext, onBack }: { email: string; onNext: (otp: string) => void; onBack: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [submitting, setSubmitting] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const focusAt = (i: number) => inputRefs.current[i]?.focus()

  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = digit
    setDigits(next)
    if (digit && i < OTP_LENGTH - 1) focusAt(i + 1)
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) focusAt(i - 1)
    if (e.key === 'ArrowLeft' && i > 0) focusAt(i - 1)
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) focusAt(i + 1)
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    const next = [...digits]
    pasted.split('').forEach((d, idx) => { next[idx] = d })
    setDigits(next)
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1))
  }

  const handleResend = async () => {
    setResent(false)
    // TODO: POST /api/auth/password-reset/request/ again
    await new Promise((r) => setTimeout(r, 500)) // stub
    setResent(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const otp = digits.join('')
    if (otp.length < OTP_LENGTH) { setError('Please enter all 6 digits.'); return }
    setSubmitting(true)
    try {
      // TODO: POST /api/auth/password-reset/verify-otp/ with { email, otp }
      await new Promise((r) => setTimeout(r, 600)) // stub
      onNext(otp)
    } catch {
      setError('Invalid or expired code. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-7 sm:p-8 flex flex-col items-center text-center space-y-6">
      {/* Animated mail icon */}
      <div className="relative group/icon">
        <div className="w-20 h-20 bg-surface-container-low rounded-2xl flex items-center justify-center rotate-3 group-hover/icon:rotate-6 transition-transform duration-500">
          <div className="w-16 h-16 bg-surface-container-highest rounded-xl flex items-center justify-center -rotate-3 group-hover/icon:-rotate-12 transition-transform duration-500">
            <Mail className="w-10 h-10 text-primary-container" aria-hidden />
          </div>
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-secondary-fixed-dim rounded-full" aria-hidden />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-tertiary-container rounded-full opacity-50" aria-hidden />
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
          Check your email
        </h2>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
          We sent a 6-digit code to{' '}
          <span className="font-bold text-on-surface">{email}</span>.
          Enter it below to continue.
        </p>
      </div>

      {/* OTP boxes */}
      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <div className="flex justify-center gap-2 md:gap-3" role="group" aria-label="One-time password input">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${i + 1}`}
              className={`w-10 h-12 md:w-14 md:h-14 text-center font-mono text-lg md:text-2xl font-bold rounded-xl border-2 outline-none transition-all duration-200
                bg-surface-container-low text-on-surface
                ${d ? 'border-primary bg-surface-container-lowest' : 'border-outline-variant/30'}
                focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20`}
            />
          ))}
        </div>

        {error && <p className="text-error text-xs font-medium">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-4 rounded-xl shadow-lg active:scale-95 hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
        >
          {submitting ? 'Verifying…' : 'Verify Code'}
        </button>

        {/* Resend + back */}
        <div className="pt-2 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleResend}
            className="text-primary-container font-semibold text-sm hover:underline decoration-2 underline-offset-4 transition-all active:scale-95"
          >
            {resent ? 'Link resent!' : "Didn't receive the email?"}
          </button>
          <div className="h-px w-12 bg-outline-variant/30" aria-hidden />
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-on-surface-variant text-sm font-medium hover:text-on-surface transition-colors group"
          >
            <ArrowLeft className="w-[18px] h-[18px] group-hover:-translate-x-1 transition-transform" aria-hidden />
            Back to sign in
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Step 3: New password ─────────────────────────────────────────────────────
function StepNewPassword({ onSuccess }: { onSuccess: () => void }) {
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const strength = getStrength(newPw)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!newPw) { setError('Please enter a new password.'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return }
    if (strength.score < 2) { setError('Please choose a stronger password.'); return }
    setSubmitting(true)
    try {
      // TODO: POST /api/auth/password-reset/confirm/ with { password: newPw, password_confirm: confirmPw }
      await new Promise((r) => setTimeout(r, 600)) // stub
      onSuccess()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-7 sm:p-8 space-y-6">
      {/* Brand icon */}
      <div className="flex justify-center">
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center shadow-card">
          <Lock className="w-6 h-6 text-on-primary" aria-hidden />
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight leading-none">
          Create new password
        </h2>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          Please enter your new password below.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* New password */}
        <div className="space-y-2">
          <label
            htmlFor="fp-new-pw"
            className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 ml-0.5"
          >
            New Password
          </label>
          <div className="relative group">
            <input
              id="fp-new-pw"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 pr-12 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
              aria-label={showNew ? 'Hide password' : 'Show password'}
            >
              {showNew ? (
                <EyeOff className="w-5 h-5" aria-hidden />
              ) : (
                <Eye className="w-5 h-5" aria-hidden />
              )}
            </button>
          </div>

          {/* Strength meter */}
          {newPw.length > 0 && (
            <div className="pt-1.5 space-y-1.5">
              <div className="flex gap-1 h-1">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      n <= strength.score ? strength.color : 'bg-outline-variant/30'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-tighter ${
                    strength.score >= 3 ? 'text-bid-green' : strength.score === 2 ? 'text-bid-amber' : 'text-error'
                  }`}
                >
                  {strength.label}
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant/50">
                  {Math.round((strength.score / 4) * 100)}% Complete
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-2">
          <label
            htmlFor="fp-confirm-pw"
            className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 ml-0.5"
          >
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="fp-confirm-pw"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 pr-12 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? (
                <EyeOff className="w-5 h-5" aria-hidden />
              ) : (
                <Eye className="w-5 h-5" aria-hidden />
              )}
            </button>
          </div>
          {/* Inline match indicator */}
          {confirmPw.length > 0 && (
            <p
              className={`text-xs font-medium transition-colors ${
                newPw === confirmPw ? 'text-bid-green' : 'text-error'
              }`}
            >
              {newPw === confirmPw ? 'Passwords match' : 'Passwords do not match'}
            </p>
          )}
        </div>

        {error && <p className="text-error text-xs font-medium">{error}</p>}

        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-4 rounded-xl shadow-lg active:scale-95 hover:brightness-110 transition-all duration-200 uppercase tracking-widest text-xs disabled:opacity-60 disabled:pointer-events-none"
          >
            {submitting ? 'Saving…' : 'Reset Password'}
          </button>
        </div>
      </form>

      <div className="flex justify-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-on-surface-variant text-sm font-medium hover:text-on-surface transition-colors group"
        >
          <ArrowLeft className="w-[18px] h-[18px] group-hover:-translate-x-1 transition-transform" aria-hidden />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

// ─── Step 4: Success state ────────────────────────────────────────────────────
function StepSuccess() {
  return (
    <div className="p-7 sm:p-8 flex flex-col items-center text-center space-y-6">
      {/* Check icon */}
      <div className="w-20 h-20 bg-bid-green/10 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-bid-green" aria-hidden />
      </div>

      <div className="space-y-2">
        <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
          Password updated!
        </h2>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
          Your password has been reset successfully. You can now sign in with your new password.
        </p>
      </div>

      <Link
        href="/auth/login"
        className="w-full block bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-4 rounded-xl shadow-lg active:scale-95 hover:brightness-110 transition-all duration-200 text-center"
      >
        Go to Sign In
      </Link>
    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>(0)
  const [email, setEmail] = useState('')

  const handleEmailNext = (submittedEmail: string) => {
    setEmail(submittedEmail)
    setStep(1)
  }

  const handleOtpNext = (_otp: string) => {
    setStep(2)
  }

  const handlePasswordSuccess = () => {
    setStep(3)
  }

  // Step labels for screen-reader context
  const stepLabels = ['Request reset', 'Verify code', 'New password', 'Complete']

  return (
    // Dark warm background matching the Stitch design intent — uses inverse-surface token
    <main className="min-h-screen bg-inverse-surface flex flex-col items-center justify-center px-4 py-12 selection:bg-primary-container selection:text-on-primary relative">
      <AmbientBlobs />

      {/* Brand wordmark */}
      <div className="mb-10 text-center z-10">
        <Link href="/" className="inline-block">
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tighter text-inverse-on-surface uppercase">
            TradeHut
          </h1>
        </Link>
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md mx-auto"
        aria-label={`Forgot password — ${stepLabels[step]}`}
      >
        {/* Glow halo behind card (Step 2 only — matches Stitch step 2 design) */}
        <div
          className={`absolute -inset-1 bg-gradient-to-tr from-primary to-primary-container rounded-xl blur opacity-0 transition-opacity duration-700 pointer-events-none ${
            step === 1 ? 'opacity-20' : ''
          }`}
          aria-hidden
        />

        <div className="relative bg-surface-container-lowest rounded-2xl md:rounded-3xl shadow-card overflow-hidden">
          {/* Step progress bar */}
          <div className="px-7 pt-5">
            <StepBar step={step} />
          </div>

          {/* Step content */}
          {step === 0 && <StepEmail onNext={handleEmailNext} />}
          {step === 1 && <StepOtp email={email} onNext={handleOtpNext} onBack={() => setStep(0)} />}
          {step === 2 && <StepNewPassword onSuccess={handlePasswordSuccess} />}
          {step === 3 && <StepSuccess />}

          {/* Bottom gradient accent line */}
          <div
            className="h-1 bg-gradient-to-r from-primary via-primary-container to-secondary-green"
            aria-hidden
          />
        </div>

        {/* Security footer note */}
        {step !== 3 && (
          <p className="mt-6 text-center font-mono text-[10px] tracking-widest uppercase text-inverse-on-surface/40 select-none">
            AES-256 Encrypted Connection
          </p>
        )}
      </div>
    </main>
  )
}
