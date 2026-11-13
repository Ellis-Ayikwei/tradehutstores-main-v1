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
    const typed = raw.replace(/\D/g, '')
    // Several digits at once is a paste or SMS autofill from the keyboard, which fires no paste
    // event. Two digits in an already filled box is just the user typing over it.
    if (typed.length > 1 && !(typed.length === 2 && digits[i])) {
      const start = typed.length >= length ? 0 : i
      const next = [...digits]
      typed
        .slice(0, length - start)
        .split('')
        .forEach((d, k) => {
          next[start + k] = d
        })
      onChange(next.join(''))
      focusAt(Math.min(start + typed.length, length - 1))
      return
    }
    const digit = typed.length === 2 ? (typed[0] === digits[i] ? typed[1] : typed[0]) : typed
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
