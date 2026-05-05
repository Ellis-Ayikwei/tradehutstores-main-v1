'use client'

/**
 * AuthModal
 *
 * Single-component implementation of the modal auth state machine described
 * in apps/authentication/MODAL_FLOW.md.
 *
 * States:
 *   identifier  → user types email/phone
 *   choose      → existing user picks password vs OTP
 *   password    → existing user enters password
 *   otp         → six-digit code (auto-advance, auto-submit)
 *   set-pass    → new user, optional password
 *   finalize    → new user, name + create
 *
 * All endpoints round-trip through `lib/authClient.ts`. Successful logins
 * dispatch `commitAuthKitSignIn` (Redux) which calls react-auth-kit `signIn`
 * and syncs guest wishlist — same pattern as Stores-Admin `authSlice` + `LoginUser`.
 */

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import { isAxiosError } from 'axios'
import {
    ArrowRight,
    Check,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    ShieldCheck,
    SmartphoneNfc,
    X,
} from 'lucide-react'
import useSignIn from 'react-auth-kit/hooks/useSignIn'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store'
import { commitAuthKitSignIn } from '@/store/authSlice'
import {
    authApi,
    type AuthError,
    type AuthMethod,
    type AuthUser,
    type IdentifyResponse,
    type TokenPair,
    type VerifyOTPSuccess,
} from '../../lib/authClient'
import renderErrorMessage from '@/utils/renderErrorMessage'

// ─── Types ───────────────────────────────────────────────────────────────────

type Step =
    | 'identifier'
    | 'choose'
    | 'password'
    | 'otp'
    | 'set-pass'
    | 'finalize'

interface Props {
    open: boolean
    onClose: () => void
    initialMode?: 'login' | 'signup' | 'auto'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractError(err: unknown): AuthError {
    if (isAxiosError(err)) {
        return (err.response?.data as AuthError) ?? { detail: err.message }
    }
    if (err instanceof Error) {
        return { detail: err.message }
    }
    return { detail: 'Something went wrong. Please try again.' }
}

function thunkRejectionMessage(e: unknown): string {
    if (isAxiosError(e)) {
        return (e.response?.data as AuthError)?.detail ?? e.message
    }
    if (typeof e === 'object' && e !== null && 'payload' in e) {
        const p = (e as { payload: unknown }).payload
        if (typeof p === 'string' && p) return p
    }
    if (e instanceof Error) return e.message
    return extractError(e).detail
}

function formatRemaining(seconds: number): string {
    if (seconds <= 0) return 'Resend code'
    return `Resend in ${seconds}s`
}

/** Normalize verify-otp JSON — treat token presence as login success. */
function tokensFromVerifyResponse(r: VerifyOTPSuccess): TokenPair | null {
    const raw = r as unknown as Record<string, unknown>
    const access =
        typeof r.access === 'string' && r.access
            ? r.access
            : typeof raw.access_token === 'string'
              ? raw.access_token
              : ''
    const refresh =
        typeof r.refresh === 'string' && r.refresh
            ? r.refresh
            : typeof raw.refresh_token === 'string'
              ? raw.refresh_token
              : ''
    const user = (r.user ?? raw.user) as AuthUser | undefined
    if (!access || !refresh || !user || typeof user !== 'object') return null
    return { access, refresh, user }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AuthModal({ open, onClose, initialMode = 'auto' }: Props) {
    const signIn = useSignIn()
    const dispatch = useDispatch<AppDispatch>()

    // ── Flow state ────────────────────────────────────────────────────────
    const [step, setStep] = useState<Step>('identifier')
    const [identifier, setIdentifier] = useState('')
    const [masked, setMasked] = useState('')
    const [flowToken, setFlowToken] = useState('')
    const [methods, setMethods] = useState<AuthMethod[]>(['otp'])

    const [password, setPassword] = useState('')
    const [code, setCode] = useState<string[]>(Array(6).fill(''))
    const [name, setName] = useState('')

    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [resendIn, setResendIn] = useState(0)

    const otpInputs = useRef<(HTMLInputElement | null)[]>([])
    const verifyOtpInFlight = useRef(false)

    // ── Reset on close so a re-open starts clean ─────────────────────────
    useEffect(() => {
        if (open) return
        const t = setTimeout(() => {
            setStep('identifier')
            setIdentifier('')
            setMasked('')
            setFlowToken('')
            setMethods(['otp'])
            setPassword('')
            setCode(Array(6).fill(''))
            setName('')
            setError(null)
            setResendIn(0)
            verifyOtpInFlight.current = false
        }, 250)
        return () => clearTimeout(t)
    }, [open])

    // ── Resend countdown timer ───────────────────────────────────────────
    useEffect(() => {
        if (resendIn <= 0) return
        const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
        return () => clearTimeout(t)
    }, [resendIn])

    // ── Auto-focus first OTP input when entering otp step ────────────────
    useEffect(() => {
        if (step === 'otp') otpInputs.current[0]?.focus()
    }, [step])

    // ── Token persistence (Redux + react-auth-kit) ───────────────────────
    const persistTokens = useCallback(
        async (pair: TokenPair) => {
            await dispatch(commitAuthKitSignIn({ pair, signIn })).unwrap()
        },
        [signIn, dispatch],
    )

    // ── Handlers ─────────────────────────────────────────────────────────
    const handleIdentify = async () => {
        setBusy(true)
        setError(null)
        try {
            const r: IdentifyResponse = await authApi.identify(identifier.trim())
            setFlowToken(r.flow_token)
            setMasked(r.masked)
            setMethods(r.methods)
            // If user explicitly picked signup mode and account exists, show
            // password/otp anyway so they can recover; UX is identical.
            if (r.exists && initialMode !== 'signup') {
                setStep('choose')
            } else {
                // Brand-new user (or signup forced): jump straight to OTP.
                await authApi.sendOtp(r.flow_token)
                setResendIn(30)
                setStep('otp')
            }
        } catch (e) {
            setError(extractError(e).detail)
        } finally {
            setBusy(false)
        }
    }

    const requestOtp = async () => {
        setBusy(true)
        setError(null)
        try {
            await authApi.sendOtp(flowToken)
            setResendIn(30)
            setStep('otp')
        } catch (e) {
            setError(extractError(e).detail)
        } finally {
            setBusy(false)
        }
    }

    const handleVerifyOtp = async (joined: string) => {
        if (!flowToken || verifyOtpInFlight.current) return
        verifyOtpInFlight.current = true
        setBusy(true)
        setError(null)
        try {
            const r = await authApi.verifyOtp(flowToken, joined)
            console.log("the r", r)
            if (r.flow_token) setFlowToken(r.flow_token)
            const pair = tokensFromVerifyResponse(r)
            if (pair) {
                try {
                    await persistTokens(pair)
                    onClose()
                } catch (e) {
                    setError(thunkRejectionMessage(e))
                }
                return
            }
            // Existing-user OTP sets session step to `completed`; do not send
            // users to set-password unless they still need a new account.
            if (r.needs_account === true) {
                setStep('set-pass')
                return
            }
            if (r.needs_account === false) {
                setError('Sign-in could not finish. Please try again or use password login.')
                return
            }
            setStep('set-pass')
        } catch (e) {
            console.log("the e", e)
            setError(renderErrorMessage(e))
            setCode(Array(6).fill(''))
            otpInputs.current[0]?.focus()
        } finally {
            setBusy(false)
            verifyOtpInFlight.current = false
        }
    }

    const handlePasswordLogin = async () => {
        setBusy(true)
        setError(null)
        try {
            const r = await authApi.loginPassword(flowToken, password)
            await persistTokens(r)
            onClose()
        } catch (e) {
            setError(thunkRejectionMessage(e))
        } finally {
            setBusy(false)
        }
    }

    const handleSetPassword = async () => {
        setBusy(true)
        setError(null)
        try {
            if (password.length >= 8) {
                await authApi.setPassword(flowToken, password)
            }
            setStep('finalize')
        } catch (e) {
            setError(extractError(e).detail)
        } finally {
            setBusy(false)
        }
    }

    const handleCreate = async () => {
        setBusy(true)
        setError(null)
        try {
            const r = await authApi.createAccount(flowToken, { name })
            await persistTokens(r)
            onClose()
        } catch (e) {
            setError(thunkRejectionMessage(e))
        } finally {
            setBusy(false)
        }
    }

    // ── OTP input plumbing ───────────────────────────────────────────────
    const setOtpDigit = (i: number, v: string) => {
        const digit = v.replace(/\D/g, '').slice(-1)
        const next = [...code]
        next[i] = digit
        setCode(next)
        if (digit && i < 5) otpInputs.current[i + 1]?.focus()
        const joined = next.join('')
        if (joined.length === 6 && !joined.includes('')) {
            void handleVerifyOtp(joined)
        }
    }
    const onOtpKey = (i: number, key: string) => {
        if (key === 'Backspace' && !code[i] && i > 0) {
            otpInputs.current[i - 1]?.focus()
        }
    }
    const onOtpPaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (!text) return
        e.preventDefault()
        const next = Array(6).fill('').map((_, i) => text[i] ?? '')
        setCode(next)
        if (next.join('').length === 6) void handleVerifyOtp(next.join(''))
        else otpInputs.current[Math.min(text.length, 5)]?.focus()
    }

    // ── Render ───────────────────────────────────────────────────────────
    if (!open) return null

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            tabIndex={-1}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
            onKeyDown={(e) => {
                if (e.key === 'Escape') onClose()
            }}
        >
            {/* Stop event bubbling so a click inside the panel doesn't close. */}
            <div
                role="presentation"
                className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-orange-500" />
                        <h2 id="auth-modal-title" className="text-base font-bold text-gray-900 dark:text-white">
                            {step === 'identifier' && 'Sign in or create account'}
                            {step === 'choose' && 'How do you want to sign in?'}
                            {step === 'password' && 'Welcome back'}
                            {step === 'otp' && 'Enter your code'}
                            {step === 'set-pass' && 'Secure your account'}
                            {step === 'finalize' && 'One last thing'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Step: identifier */}
                    {step === 'identifier' && (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Enter your email or phone — we&rsquo;ll figure out the rest.
                            </p>
                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    autoFocus
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && identifier.trim()) handleIdentify()
                                    }}
                                    placeholder="you@example.com or +233 …"
                                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                />
                            </div>
                            <Primary
                                onClick={handleIdentify}
                                disabled={busy || !identifier.trim()}
                                busy={busy}
                            >
                                Continue
                                <ArrowRight size={16} />
                            </Primary>
                        </>
                    )}

                    {/* Step: choose method */}
                    {step === 'choose' && (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                You already have an account ({masked}). Pick a method:
                            </p>
                            <div className="space-y-2">
                                {methods.includes('password') && (
                                    <Choice
                                        icon={<Lock size={18} />}
                                        title="Use password"
                                        subtitle="Fastest if you remember it"
                                        onClick={() => setStep('password')}
                                    />
                                )}
                                <Choice
                                    icon={<KeyRound size={18} />}
                                    title="Email me a code"
                                    subtitle={`Send a 6-digit code to ${masked}`}
                                    onClick={requestOtp}
                                />
                            </div>
                        </>
                    )}

                    {/* Step: password */}
                    {step === 'password' && (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Welcome back, {masked}.
                            </p>
                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    autoFocus
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handlePasswordLogin()
                                    }}
                                    placeholder="Password"
                                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={requestOtp}
                                className="text-xs font-semibold text-orange-500 hover:underline"
                            >
                                Use a code instead
                            </button>
                            <Primary
                                onClick={handlePasswordLogin}
                                disabled={busy || !password}
                                busy={busy}
                            >
                                Sign in
                                <ArrowRight size={16} />
                            </Primary>
                        </>
                    )}

                    {/* Step: OTP */}
                    {step === 'otp' && (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                We sent a 6-digit code to <span className="font-semibold">{masked}</span>.
                            </p>
                            <div
                                className="flex justify-between gap-2"
                                onPaste={onOtpPaste}
                            >
                                {code.map((d, i) => (
                                    <input
                                        // eslint-disable-next-line react/no-array-index-key
                                        key={`otp-${i}`}
                                        ref={(el) => {
                                            otpInputs.current[i] = el
                                        }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={d}
                                        onChange={(e) => setOtpDigit(i, e.target.value)}
                                        onKeyDown={(e) => onOtpKey(i, e.key)}
                                        className="w-11 h-12 text-center text-lg font-bold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                ))}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <button
                                    type="button"
                                    disabled={resendIn > 0 || busy}
                                    onClick={requestOtp}
                                    className="font-semibold text-orange-500 hover:underline disabled:text-gray-400 disabled:no-underline"
                                >
                                    {formatRemaining(resendIn)}
                                </button>
                                <SmartphoneNfc size={14} className="text-gray-400" />
                            </div>
                        </>
                    )}

                    {/* Step: set password (optional) */}
                    {step === 'set-pass' && (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Optional: set a password so you can sign in faster next time.
                            </p>
                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    autoFocus
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStep('finalize')}
                                    className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                >
                                    Skip
                                </button>
                                <Primary
                                    onClick={handleSetPassword}
                                    disabled={busy || password.length < 8}
                                    busy={busy}
                                >
                                    Set password
                                    <Check size={16} />
                                </Primary>
                            </div>
                        </>
                    )}

                    {/* Step: finalize signup */}
                    {step === 'finalize' && (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                What should we call you?
                            </p>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate()
                                }}
                                placeholder="Your name (optional)"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                            />
                            <Primary
                                onClick={handleCreate}
                                disabled={busy}
                                busy={busy}
                            >
                                Create account
                                <ArrowRight size={16} />
                            </Primary>
                        </>
                    )}

                    {/* Error footer */}
                    {error && (
                        <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-500 text-center">
                    By continuing you agree to TradeHut&rsquo;s Terms & Privacy Policy.
                </div>
            </div>
        </div>
    )
}

// ─── Bits ────────────────────────────────────────────────────────────────────

function Primary({
    children,
    onClick,
    disabled,
    busy,
}: {
    children: React.ReactNode
    onClick: () => void
    disabled?: boolean
    busy?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
        >
            {busy ? <Loader2 className="animate-spin" size={16} /> : children}
        </button>
    )
}

function Choice({
    icon,
    title,
    subtitle,
    onClick,
}: {
    icon: React.ReactNode
    title: string
    subtitle: string
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition text-left"
        >
            <div className="h-10 w-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
            </div>
            <ArrowRight size={16} className="text-gray-400 shrink-0" />
        </button>
    )
}
