'use client'

import { useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
}

/** Segmented one-time-code input (paste, arrows and backspace supported). */
export default function OtpInput({ length = 6, value, onChange, invalid, disabled }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const focusAt = (i: number) => refs.current[i]?.focus()

  const setDigit = (i: number, digit: string) => {
    const next = [...digits]
    next[i] = digit
    onChange(next.join(''))
  }

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    setDigit(i, digit)
    if (digit && i < length - 1) focusAt(i + 1)
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) focusAt(i - 1)
    if (e.key === 'ArrowLeft' && i > 0) focusAt(i - 1)
    if (e.key === 'ArrowRight' && i < length - 1) focusAt(i + 1)
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    focusAt(Math.min(pasted.length, length - 1))
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="One-time code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid ? true : undefined}
          className={`h-12 w-10 rounded-lg border bg-white text-center font-mono text-xl font-bold text-zinc-900 outline-none transition-colors focus:ring-2 disabled:bg-zinc-50 disabled:text-zinc-500 sm:h-14 sm:w-12 ${
            invalid
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
              : 'border-zinc-300 focus:border-primary focus:ring-primary-200'
          }`}
        />
      ))}
    </div>
  )
}
