'use client'

import { Field, TextInput } from './ui'

const HEX = /^#[0-9a-f]{6}$/i

export const isHexColour = (value: string): boolean => HEX.test(value.trim())

/** Option types that carry a colour: swatch display type, or named Colour / Color. */
export const isColourAttribute = (name: string, displayType?: string | null): boolean => displayType === 'swatch' || /^colou?rs?$/i.test(name.trim())

/** Empty is allowed (no colour); anything else must be #RRGGBB. Returns a message or ''. */
export const colourError = (value: string): string => (value.trim() === '' || isHexColour(value) ? '' : 'Use a colour like #E1AD01.')

interface ColourFieldProps {
    value: string
    onChange: (next: string) => void
    label?: string
    disabled?: boolean
}

/** Native colour picker beside a hex text field. Both edit the same value. */
export function ColourField({ value, onChange, label = 'Colour', disabled }: ColourFieldProps) {
    const error = colourError(value)
    return (
        <Field label={label} error={error}>
            {(field) => (
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        aria-label={`${label} picker`}
                        value={isHexColour(value) ? value.trim().toLowerCase() : '#000000'}
                        onChange={(e) => onChange(e.target.value.toUpperCase())}
                        disabled={disabled}
                        className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-zinc-300 bg-white p-1 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <TextInput
                        {...field}
                        value={value}
                        onChange={(e) => {
                            const next = e.target.value.trim()
                            onChange(next && !next.startsWith('#') ? `#${next}` : next)
                        }}
                        placeholder="#RRGGBB"
                        maxLength={7}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={disabled}
                        className="font-mono"
                    />
                </div>
            )}
        </Field>
    )
}
