import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';

const HEX = /^#[0-9a-f]{6}$/i;

export const isHexColour = (value: string): boolean => HEX.test(value.trim());

/** Option types that carry a colour: swatch display type, or named Colour / Color. */
export const isColourAttribute = (name: string, displayType?: string | null): boolean => displayType === 'swatch' || /^colou?rs?$/i.test(name.trim());

/** Empty is allowed (no colour); anything else must be #RRGGBB. Returns a message or ''. */
export const colourError = (value: string): string => (value.trim() === '' || isHexColour(value) ? '' : 'Use a colour like #E1AD01.');

interface ColourFieldProps {
    id: string;
    value: string;
    onChange: (next: string) => void;
    label?: string;
    disabled?: boolean;
}

/** Native colour picker beside a hex text field. Both edit the same value. */
export function ColourField({ id, value, onChange, label = 'Colour', disabled }: ColourFieldProps) {
    const error = colourError(value);
    return (
        <div className="space-y-1.5">
            <Label htmlFor={`${id}-hex`}>{label}</Label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    aria-label={`${label} picker`}
                    value={isHexColour(value) ? value.trim().toLowerCase() : '#000000'}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    disabled={disabled}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-card p-1 disabled:cursor-not-allowed"
                />
                <Input
                    id={`${id}-hex`}
                    value={value}
                    onChange={(e) => {
                        const next = e.target.value.trim();
                        onChange(next && !next.startsWith('#') ? `#${next}` : next);
                    }}
                    placeholder="#RRGGBB"
                    maxLength={7}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-hex-error` : undefined}
                    className="font-mono"
                />
            </div>
            {error ? (
                <p id={`${id}-hex-error`} className="text-xs font-medium text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
