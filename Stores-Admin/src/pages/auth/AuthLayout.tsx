import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    /** Line under the card, usually a link to the neighbouring auth page. */
    footer?: ReactNode;
}

/** Shared frame for the sign-in, password reset and access pages: one centred card on every screen size. */
export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-900">
            <main className="w-full max-w-md">
                <img className="mx-auto h-10 w-auto" src="/assets/images/tradehut3.png" alt="TradeHut Stores" />
                <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                    <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
                    <p className="mt-1.5 text-sm text-zinc-600">{subtitle}</p>
                    <div className="mt-6">{children}</div>
                </div>
                {footer && <div className="mt-6 text-center text-sm text-zinc-700">{footer}</div>}
            </main>
            <p className="mt-8 flex items-center gap-1.5 text-xs text-zinc-500">
                <ShieldCheck size={14} aria-hidden />
                Restricted area. Authorised users only.
            </p>
        </div>
    );
}

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
    label: string;
    icon: LucideIcon;
    error?: string;
    labelAction?: ReactNode;
}

export function AuthField({ label, icon: Icon, error, labelAction, id, ...rest }: AuthFieldProps) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const isPassword = rest.type === 'password';
    const [show, setShow] = useState(false);

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor={inputId} className="text-sm font-medium text-zinc-800">
                    {label}
                </label>
                {labelAction}
            </div>
            <div className="relative">
                <Icon size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                    {...rest}
                    id={inputId}
                    type={isPassword && show ? 'text' : rest.type}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    className={`block h-12 w-full rounded-lg border bg-white pl-11 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:ring-2 ${
                        isPassword ? 'pr-12' : 'pr-4'
                    } ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-zinc-300 focus:border-primary focus:ring-primary-200'}`}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        aria-label={show ? 'Hide password' : 'Show password'}
                        aria-pressed={show}
                        className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-r-lg text-zinc-500 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                    >
                        {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                    </button>
                )}
            </div>
            {error && (
                <p id={`${inputId}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
                    <AlertCircle size={14} aria-hidden className="shrink-0" />
                    {error}
                </p>
            )}
        </div>
    );
}

export function AuthError({ children }: { children: ReactNode }) {
    return (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />
            <div>{children}</div>
        </div>
    );
}

export function AuthSubmit({ loading, loadingLabel, disabled, children }: { loading: boolean; loadingLabel: string; disabled?: boolean; children: ReactNode }) {
    return (
        <button
            type="submit"
            disabled={loading || disabled}
            aria-busy={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
        >
            {loading ? (
                <>
                    <Loader2 size={18} className="animate-spin" aria-hidden />
                    {loadingLabel}
                </>
            ) : (
                children
            )}
        </button>
    );
}
