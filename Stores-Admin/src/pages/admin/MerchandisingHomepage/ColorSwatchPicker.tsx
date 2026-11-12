import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { cn } from '@/lib/utils';
import type { ColorPreset } from './constants';

interface ColorSwatchPickerProps {
    id: string;
    value: string;
    presets: ColorPreset[];
    onChange: (v: string) => void;
}

export function ColorSwatchPicker({ id, value, presets, onChange }: ColorSwatchPickerProps) {
    const matched = presets.find((p) => p.value.toLowerCase() === value.toLowerCase());
    const isCustom = !!value && !matched;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Colour presets">
                {presets.map((p) => {
                    const selected = matched === p;
                    const isNone = p.value === '';
                    return (
                        <button
                            key={p.name}
                            type="button"
                            onClick={() => onChange(p.value)}
                            title={p.value ? `${p.name} · ${p.value}` : p.name}
                            aria-label={p.name}
                            aria-pressed={selected}
                            className={cn(
                                'relative h-8 w-8 shrink-0 rounded-full border transition-shadow focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-subtle',
                                isNone && 'bg-card',
                                selected ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border hover:border-muted-foreground'
                            )}
                            style={!isNone ? { backgroundColor: p.value } : undefined}
                        >
                            {isNone ? (
                                <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                                    <span className="block h-px w-5 rotate-45 bg-muted-foreground" />
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-2">
                <span
                    className={cn('h-9 w-9 shrink-0 rounded-md border border-border', !value && 'bg-muted')}
                    style={value ? { backgroundColor: value } : undefined}
                    aria-hidden
                />
                <Input id={id} className="flex-1 font-mono text-xs" value={value} placeholder="Custom hex (e.g. #ff8800)" spellCheck={false} onChange={(e) => onChange(e.target.value)} />
                {isCustom ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
                        Clear
                    </Button>
                ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{matched ? matched.name : isCustom ? `Custom · ${value}` : 'No colour (uses default surface)'}</p>
        </div>
    );
}
