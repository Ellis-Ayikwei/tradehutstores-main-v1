import { Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Switch } from '@/components/shadcn/switch';
import type { HeroBackgroundStyle, HeroConfig, HeroLayout, HeroTransition } from '@/services/heroAdminService';
import { ColorField, isHex } from './ColorField';

const LAYOUTS: { value: HeroLayout; label: string; hint: string }[] = [
    { value: 'carousel', label: 'Carousel', hint: 'One full-width rotating banner.' },
    { value: 'carousel_side', label: 'Carousel + side tiles', hint: 'Rotating banner with two stacked tiles.' },
    { value: 'bento', label: 'Bento grid', hint: 'Large banner beside up to four tiles.' },
];

function LayoutGlyph({ layout }: { layout: HeroLayout }) {
    const block = 'rounded-sm bg-muted-foreground';
    if (layout === 'carousel') return <div className={`h-10 w-full ${block}`} />;
    if (layout === 'carousel_side') {
        return (
            <div className="grid h-10 w-full grid-cols-4 gap-1">
                <div className={`col-span-3 ${block}`} />
                <div className="grid grid-rows-2 gap-1">
                    <div className={block} />
                    <div className={block} />
                </div>
            </div>
        );
    }
    return (
        <div className="grid h-10 w-full grid-cols-2 gap-1">
            <div className={block} />
            <div className="grid grid-cols-2 grid-rows-2 gap-1">
                <div className={block} />
                <div className={block} />
                <div className={block} />
                <div className={block} />
            </div>
        </div>
    );
}

interface LayoutTabProps {
    config: HeroConfig;
    onChange: (patch: Partial<HeroConfig>) => void;
    onSave: () => void;
    saving: boolean;
    dirty: boolean;
    errors: Record<string, string>;
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            </div>
            {children}
        </div>
    );
}

export function LayoutTab({ config, onChange, onSave, saving, dirty, errors }: LayoutTabProps) {
    const colorsValid =
        config.background_style === 'none' ||
        (config.background_style === 'solid' && isHex(config.background_color)) ||
        (config.background_style === 'gradient' && isHex(config.gradient_from) && isHex(config.gradient_to));

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Name</CardTitle>
                    <CardDescription>Only staff see this. Use it to tell your heroes apart, for example "Everyday" or "Black Friday".</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                    <Label htmlFor="hero-name">Hero name</Label>
                    <Input id="hero-name" value={config.name} maxLength={80} onChange={(e) => onChange({ name: e.target.value })} aria-invalid={errors.name ? true : undefined} />
                    {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Arrangement</CardTitle>
                    <CardDescription>How the banners are laid out on the home page. Slides are assigned to the main area or the tiles on the Slides tab.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div role="radiogroup" aria-label="Hero layout" className="grid gap-3 sm:grid-cols-3">
                        {LAYOUTS.map((l) => {
                            const selected = config.layout === l.value;
                            return (
                                <button
                                    key={l.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => onChange({ layout: l.value })}
                                    className={`flex flex-col gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-subtle ${
                                        selected ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-muted'
                                    }`}
                                >
                                    <LayoutGlyph layout={l.value} />
                                    <span>
                                        <span className="block text-sm font-semibold text-foreground">{l.label}</span>
                                        <span className="block text-xs text-muted-foreground">{l.hint}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Rotation and controls</CardTitle>
                    <CardDescription>Applies to the main carousel.</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                    <Row title="Autoplay" hint="Rotate automatically. Pauses on hover, focus and touch.">
                        <Switch checked={config.autoplay} onCheckedChange={(v) => onChange({ autoplay: v })} aria-label="Autoplay" />
                    </Row>
                    <Row title="Seconds per slide" hint="Between 2 and 30.">
                        <Input
                            type="number"
                            min={2}
                            max={30}
                            value={config.interval_seconds}
                            onChange={(e) => onChange({ interval_seconds: Number(e.target.value) })}
                            disabled={!config.autoplay}
                            aria-label="Seconds per slide"
                            aria-invalid={Boolean(errors.interval_seconds)}
                            className="w-24"
                        />
                    </Row>
                    <Row title="Transition">
                        <Select value={config.transition} onValueChange={(v) => onChange({ transition: v as HeroTransition })}>
                            <SelectTrigger className="w-40" aria-label="Transition">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="slide">Slide</SelectItem>
                                <SelectItem value="fade">Fade</SelectItem>
                            </SelectContent>
                        </Select>
                    </Row>
                    <Row title="Arrows" hint="Previous / next buttons on tablet and desktop.">
                        <Switch checked={config.show_arrows} onCheckedChange={(v) => onChange({ show_arrows: v })} aria-label="Show arrows" />
                    </Row>
                    <Row title="Dots">
                        <Switch checked={config.show_dots} onCheckedChange={(v) => onChange({ show_dots: v })} aria-label="Show dots" />
                    </Row>
                    <Row title="Height on desktop (px)" hint="Between 200 and 640. Mobile keeps a fixed ratio.">
                        <Input
                            type="number"
                            min={200}
                            max={640}
                            step={10}
                            value={config.height_desktop}
                            onChange={(e) => onChange({ height_desktop: Number(e.target.value) })}
                            aria-label="Height on desktop"
                            aria-invalid={Boolean(errors.height_desktop)}
                            className="w-24"
                        />
                    </Row>
                    <Row title="Rounded corners">
                        <Switch checked={config.rounded} onCheckedChange={(v) => onChange({ rounded: v })} aria-label="Rounded corners" />
                    </Row>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Section background</CardTitle>
                    <CardDescription>The strip behind the hero. Leave on None to follow the page and the light / dark theme.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-xs space-y-1.5">
                        <Label htmlFor="hero-bg-style">Style</Label>
                        <Select value={config.background_style} onValueChange={(v) => onChange({ background_style: v as HeroBackgroundStyle })}>
                            <SelectTrigger id="hero-bg-style">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="solid">Solid colour</SelectItem>
                                <SelectItem value="gradient">Gradient</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {config.background_style === 'solid' ? (
                        <div className="max-w-xs">
                            <ColorField id="hero-bg-color" label="Colour" value={config.background_color} onChange={(v) => onChange({ background_color: v })} error={errors.background_color} />
                        </div>
                    ) : null}
                    {config.background_style === 'gradient' ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <ColorField id="hero-grad-from" label="From" value={config.gradient_from} onChange={(v) => onChange({ gradient_from: v })} error={errors.gradient_from} />
                            <ColorField id="hero-grad-to" label="To" value={config.gradient_to} onChange={(v) => onChange({ gradient_to: v })} error={errors.gradient_to} />
                            <div className="space-y-1.5">
                                <Label htmlFor="hero-grad-angle">Angle ({config.gradient_angle} deg)</Label>
                                <input
                                    id="hero-grad-angle"
                                    type="range"
                                    min={0}
                                    max={360}
                                    step={5}
                                    value={config.gradient_angle}
                                    onChange={(e) => onChange({ gradient_angle: Number(e.target.value) })}
                                    className="h-9 w-full accent-primary"
                                />
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-background py-3">
                {dirty ? <span className="text-sm text-muted-foreground">Unsaved changes</span> : null}
                <Button type="button" onClick={onSave} disabled={saving || !dirty || !colorsValid}>
                    {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    Save layout
                </Button>
            </div>
        </div>
    );
}
