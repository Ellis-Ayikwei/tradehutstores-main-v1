import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** `#rgb` -> `#rrggbb`, because <input type="color"> only accepts the long form. */
function longHex(value: string, fallback: string): string {
    if (!HEX.test(value)) return fallback;
    if (value.length === 4) return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    return value;
}

interface ColorFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

export function ColorField({ id, label, value, onChange, error }: ColorFieldProps) {
    const invalid = value !== '' && !HEX.test(value);
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    aria-label={`${label} picker`}
                    value={longHex(value, '#000000')}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-card p-1"
                />
                <Input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value.trim())}
                    placeholder="#18181b"
                    maxLength={7}
                    spellCheck={false}
                    aria-invalid={invalid || Boolean(error)}
                    className="font-mono"
                />
            </div>
            {invalid ? <p className="text-xs text-destructive-subtle-foreground">Use a hex colour such as #18181b.</p> : null}
            {error ? <p className="text-xs text-destructive-subtle-foreground">{error}</p> : null}
        </div>
    );
}

export const isHex = (value: string) => HEX.test(value);
