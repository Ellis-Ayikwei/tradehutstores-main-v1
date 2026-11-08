'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Check, Circle, Lock, Mail, MailCheck, Phone, RefreshCw, ShieldCheck, User } from 'lucide-react'
import AuthShell from '../_components/AuthShell'
import OtpInput from '../_components/OtpInput'
import { ErrorBanner, PrimaryButton, SecondaryButton, TextField } from '../_components/fields'
import { storefrontHref } from '@/lib/storefront'
import { parseAuthError, registerUser, resendSignupOtp, verifySignupOtp } from '@/lib/auth-api'

// --- Validation Schema -------------------------------------------------------

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .test('first-last', 'Enter your first and last name', (v) => (v ?? '').trim().split(/\s+/).length >= 2)
    .required('Full name is required'),
  email: Yup.string().trim().email('Enter a valid email address').required('Email is required'),
  phone: Yup.string().test('phone-length', 'Enter a valid phone number', (v) => !v || v.replace(/\D/g, '').length >= 10),
  password: Yup.string()
    .min(8, 'Use at least 8 characters')
    .matches(/[A-Z]/, 'Add an uppercase letter')
    .matches(/[0-9]/, 'Add a number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm your password'),
})

type FormValues = {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

/** Backend serializer field name -> form field name (RegisterSerializer, serializer.py:52-61). */
const API_FIELD_MAP: Record<string, keyof FormValues> = {
  email: 'email',
  phone_number: 'phone',
  password: 'password',
  password2: 'confirmPassword',
  first_name: 'name',
  last_name: 'name',
}

const RESEND_COOLDOWN_SECONDS = 60
const OTP_LENGTH = 6

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600']

type Stage = 'details' | 'verify' | 'done'

// --- Sub-Components ----------------------------------------------------------

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6" role="group" aria-label={`Step ${current} of ${total}`}>
      <div className="flex h-1.5 gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-colors duration-300 ${
              i < current ? 'bg-primary' : 'bg-zinc-200'
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-zinc-600">
        Step {current} of {total}
      </p>
    </div>
  )
}

function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 text-sm ${met ? 'text-emerald-700' : 'text-zinc-600'}`}>
      {met ? <Check size={14} aria-hidden /> : <Circle size={14} aria-hidden />}
      {children}
    </li>
  )
}

// --- Main Page ---------------------------------------------------------------

export default function RegisterPage() {
  const [stage, setStage] = useState<Stage>('details')
  const [formError, setFormError] = useState('')
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof FormValues, string>>>({})

  // Verification step
  const [verifyEmail, setVerifyEmail] = useState('')
  const [otpSent, setOtpSent] = useState(true)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendNotice, setResendNotice] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Single timeout chain; the effect cleanup clears it on unmount or reset.
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const formik = useFormik<FormValues>({
    initialValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
    validationSchema,
    onSubmit: async (values) => {
      setFormError('')
      setServerErrors({})

      // The backend wants separate first/last names and lowercases the email on create.
      const [first, ...rest] = values.name.trim().split(/\s+/)
      const email = values.email.trim().toLowerCase()
      const phone = values.phone.trim()

      try {
        const result = await registerUser({
          email,
          password: values.password,
          password2: values.confirmPassword,
          first_name: first,
          last_name: rest.join(' '),
          ...(phone ? { phone_number: phone } : {}),
        })
        setVerifyEmail(email)
        setOtpSent(result.otpSent)
        setCode('')
        if (result.otpSent) setResendCooldown(RESEND_COOLDOWN_SECONDS)
        setStage('verify')
      } catch (err) {
        const parsed = parseAuthError(err)
        const mapped: Partial<Record<keyof FormValues, string>> = {}
        for (const [apiField, message] of Object.entries(parsed.fields)) {
          const target = API_FIELD_MAP[apiField]
          if (target && !mapped[target]) mapped[target] = message
        }
        setServerErrors(mapped)
        if (Object.keys(mapped).length === 0) setFormError(parsed.message)
      }
    },
  })

  const pwStrength = useMemo(() => {
    const pw = formik.values.password
    if (!pw) return 0
    let s = 0
    if (pw.length >= 8) s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }, [formik.values.password])

  const fieldProps = (name: keyof FormValues) => ({
    ...formik.getFieldProps(name),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (serverErrors[name]) setServerErrors((prev) => ({ ...prev, [name]: undefined }))
      if (formError) setFormError('')
      formik.handleChange(e)
    },
    error: formik.touched[name] && formik.errors[name] ? String(formik.errors[name]) : serverErrors[name],
  })

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifyError('')
    if (code.length < OTP_LENGTH) {
      setVerifyError(`Enter all ${OTP_LENGTH} digits of the code.`)
      return
    }
    setVerifying(true)
    try {
      await verifySignupOtp(verifyEmail, code)
      setStage('done')
    } catch (err) {
      const parsed = parseAuthError(err)
      // USER_NOT_FOUND must not leak whether an address is registered.
      setVerifyError(
        parsed.code === 'USER_NOT_FOUND' ? 'That code is not valid. Check it and try again.' : parsed.message,
      )
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    setVerifyError('')
    setResendNotice('')
    setResending(true)
    try {
      await resendSignupOtp(verifyEmail)
      setOtpSent(true)
      setCode('')
      setResendNotice('A new code is on its way. Check your inbox and spam folder.')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      const parsed = parseAuthError(err)
      setVerifyError(
        parsed.code === 'USER_NOT_FOUND' ? 'We could not send a new code. Please try again later.' : parsed.message,
      )
    } finally {
      setResending(false)
    }
  }

  const pw = formik.values.password

  return (
    <AuthShell
      heroTitle="Buy, sell and bid on TradeHut"
      heroText="Create one account to shop deals, join live auctions and request quotes from suppliers."
    >
      {stage !== 'done' && <StepProgress current={stage === 'details' ? 1 : 2} total={2} />}

      {/* STEP 1: ACCOUNT DETAILS */}
      {stage === 'details' && (
        <div>
          <header className="mb-6">
            <h1 className="font-display text-2xl font-extrabold text-zinc-900 sm:text-3xl">Create your account</h1>
            <p className="mt-1.5 text-sm text-zinc-600">We use these to secure your account and send order updates.</p>
          </header>

          <form noValidate onSubmit={formik.handleSubmit} className="space-y-4">
            {formError && <ErrorBanner>{formError}</ErrorBanner>}

            <TextField
              label="Full name"
              icon={User}
              autoComplete="name"
              placeholder="First and last name"
              {...fieldProps('name')}
            />
            <TextField
              label="Email"
              type="email"
              icon={Mail}
              autoComplete="email"
              inputMode="email"
              placeholder="Enter your email"
              {...fieldProps('email')}
            />
            <TextField
              label="Phone number (optional)"
              type="tel"
              icon={Phone}
              autoComplete="tel"
              inputMode="tel"
              placeholder="Enter your phone number"
              hint="Used for delivery and security alerts."
              {...fieldProps('phone')}
            />

            <div>
              <TextField
                label="Password"
                type="password"
                icon={Lock}
                autoComplete="new-password"
                placeholder="Create a password"
                {...fieldProps('password')}
              />
              {pw && (
                <div className="mt-3">
                  <div className="flex h-1.5 gap-1" aria-hidden>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-full transition-colors ${
                          i <= pwStrength ? STRENGTH_COLORS[pwStrength] : 'bg-zinc-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-zinc-700" aria-live="polite">
                    Password strength: {STRENGTH_LABELS[pwStrength]}
                  </p>
                </div>
              )}
              <ul className="mt-2 space-y-1">
                <Rule met={pw.length >= 8}>At least 8 characters</Rule>
                <Rule met={/[A-Z]/.test(pw)}>One uppercase letter</Rule>
                <Rule met={/[0-9]/.test(pw)}>One number</Rule>
              </ul>
            </div>

            <TextField
              label="Confirm password"
              type="password"
              icon={ShieldCheck}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              {...fieldProps('confirmPassword')}
            />

            <div className="pt-2">
              <PrimaryButton loading={formik.isSubmitting} loadingLabel="Creating account…">
                Create account
              </PrimaryButton>
            </div>
            <p className="text-center text-xs text-zinc-600">
              By creating an account you agree to our{' '}
              <a href={storefrontHref("/legal/terms")} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-700 hover:underline">
                Terms
              </a>{' '}
              and{' '}
              <a href={storefrontHref("/legal/privacy")} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-700 hover:underline">
                Privacy Policy
              </a>
              .
            </p>

            <p className="text-center text-sm text-zinc-700">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="inline-flex min-h-[44px] items-center font-semibold text-primary-700 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      )}

      {/* STEP 2: EMAIL VERIFICATION (6-digit code; the backend sends a code, not a link) */}
      {stage === 'verify' && (
        <div className="text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
            <Mail size={30} className="text-primary-700" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-zinc-900 sm:text-3xl">Verify your email</h1>
          {otpSent ? (
            <p className="mx-auto mt-2 max-w-xs break-words text-sm leading-relaxed text-zinc-600">
              We sent a {OTP_LENGTH}-digit code to <span className="font-semibold text-zinc-900">{verifyEmail}</span>.
              Enter it below to activate your account.
            </p>
          ) : (
            <div className="mt-4 text-left">
              <ErrorBanner>
                Your account was created, but we could not send the verification code to{' '}
                <span className="break-all font-semibold">{verifyEmail}</span>. Use Resend code to try again.
              </ErrorBanner>
            </div>
          )}

          <form onSubmit={handleVerify} className="mt-6 space-y-4" noValidate>
            <OtpInput
              length={OTP_LENGTH}
              value={code}
              onChange={(v) => {
                setCode(v)
                if (verifyError) setVerifyError('')
              }}
              invalid={!!verifyError}
              disabled={verifying}
            />

            {verifyError && (
              <div className="text-left">
                <ErrorBanner>{verifyError}</ErrorBanner>
              </div>
            )}
            {resendNotice && !verifyError && (
              <p role="status" className="text-sm text-emerald-700">
                {resendNotice}
              </p>
            )}

            <PrimaryButton loading={verifying} loadingLabel="Verifying…">
              Verify email
            </PrimaryButton>
          </form>

          <div className="mx-auto mt-4 max-w-sm space-y-3">
            <SecondaryButton disabled={resendCooldown > 0 || resending} onClick={handleResend}>
              <RefreshCw size={16} className={resending ? 'animate-spin' : undefined} aria-hidden />
              {resending ? 'Sending…' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
            </SecondaryButton>
          </div>
        </div>
      )}

      {/* DONE */}
      {stage === 'done' && (
        <div className="text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <MailCheck size={30} className="text-emerald-700" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-zinc-900 sm:text-3xl">Email verified</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-600">
            Your account is active. Sign in with your email and password to start shopping.
          </p>
          <Link
            href="/auth/login"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-base font-bold text-zinc-900 transition-colors hover:bg-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
          >
            Go to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
