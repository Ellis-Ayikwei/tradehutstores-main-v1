'use client'

import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const INPUT_BASE =
  'block h-12 w-full rounded-lg border bg-white pl-11 pr-4 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:ring-2 disabled:bg-zinc-50 disabled:text-zinc-500'
const INPUT_OK = 'border-zinc-300 focus:border-primary focus:ring-primary-200'
const INPUT_ERR = 'border-red-500 focus:border-red-500 focus:ring-red-200'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string
  icon: LucideIcon
  error?: string
  hint?: string
  labelAction?: React.ReactNode
}

export function TextField({ label, icon: Icon, error, hint, labelAction, id, ...rest }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
  const isPassword = rest.type === 'password'
  const [show, setShow] = useState(false)

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-800">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <Icon
          size={18}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          {...rest}
          id={inputId}
          type={isPassword && show ? 'text' : rest.type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_BASE} ${error ? INPUT_ERR : INPUT_OK} ${isPassword ? 'pr-12' : ''}`}
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
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={14} aria-hidden className="shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-zinc-600">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
    >
      <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

interface SubmitButtonProps {
  loading?: boolean
  loadingLabel?: string
  type?: 'submit' | 'button'
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}

/** Primary CTA: brand orange with dark text (white on #F5620F fails AA contrast). */
export function PrimaryButton({
  loading = false,
  loadingLabel = 'Please wait…',
  type = 'submit',
  onClick,
  disabled,
  children,
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      aria-busy={loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-bold text-zinc-900 transition-colors hover:bg-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
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
  )
}

export function SecondaryButton({
  onClick,
  type = 'button',
  disabled,
  children,
}: {
  onClick?: () => void
  type?: 'submit' | 'button'
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-base font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
    >
      {children}
    </button>
  )
}
