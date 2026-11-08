'use client'

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export const inputClass =
    'block min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500'

function borderClass(error?: string) {
    return error
        ? 'border-red-500 focus:border-red-600 focus:ring-red-200 dark:focus:ring-red-900'
        : 'border-gray-300 focus:border-primary-700 focus:ring-primary-200 dark:border-gray-700 dark:focus:ring-primary-900'
}

export function Field({
    id,
    label,
    optional,
    hint,
    error,
    children,
}: {
    id: string
    label: string
    optional?: boolean
    hint?: string
    error?: string
    children: ReactNode
}) {
    return (
        <div>
            <label htmlFor={id} className="mb-1 flex items-baseline justify-between gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                <span>{label}</span>
                {optional ? <span className="text-xs font-normal text-gray-500 dark:text-gray-400">Optional</span> : null}
            </label>
            {children}
            {error ? (
                <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {error}
                </p>
            ) : hint ? (
                <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {hint}
                </p>
            ) : null}
        </div>
    )
}

type BaseProps = { id: string; label: string; optional?: boolean; hint?: string; error?: string }

export function TextField({
    id,
    label,
    optional,
    hint,
    error,
    ...rest
}: BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>) {
    return (
        <Field id={id} label={label} optional={optional} hint={hint} error={error}>
            <input
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
                className={`${inputClass} ${borderClass(error)}`}
                {...rest}
            />
        </Field>
    )
}

export function TextAreaField({
    id,
    label,
    optional,
    hint,
    error,
    ...rest
}: BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>) {
    return (
        <Field id={id} label={label} optional={optional} hint={hint} error={error}>
            <textarea
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
                className={`${inputClass} ${borderClass(error)}`}
                {...rest}
            />
        </Field>
    )
}

export function SelectField({
    id,
    label,
    optional,
    hint,
    error,
    children,
    ...rest
}: BaseProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>) {
    return (
        <Field id={id} label={label} optional={optional} hint={hint} error={error}>
            <select
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
                className={`${inputClass} ${borderClass(error)}`}
                {...rest}
            >
                {children}
            </select>
        </Field>
    )
}
