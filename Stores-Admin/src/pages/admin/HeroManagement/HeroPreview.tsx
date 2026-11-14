import type { CSSProperties } from 'react';
import { previewBackground, type HeroConfig, type HeroSlide } from '@/services/heroAdminService';

type PreviewSlide = Pick<
    HeroSlide,
    | 'placement'
    | 'image_desktop_url'
    | 'video_url'
    | 'eyebrow'
    | 'title'
    | 'subtitle'
    | 'cta_label'
    | 'cta_bg_color'
    | 'cta_text_color'
    | 'text_color'
    | 'text_align'
    | 'overlay_strength'
    | 'background_style'
    | 'background_color'
    | 'gradient_from'
    | 'gradient_to'
    | 'gradient_angle'
> & { id: number | string };

const ALIGN = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' } as const;
const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;

/** Most tiles each layout can show. */
const TILE_LIMIT = { carousel: 0, full_bleed: 0, carousel_side: 2, bento: 4, tiles_below: 4, flanked: 4 } as const;

function Tile({ slide, big }: { slide: PreviewSlide; big?: boolean }) {
    const bg = previewBackground(slide.background_style, slide.background_color, slide.gradient_from, slide.gradient_to, slide.gradient_angle);
    const style: CSSProperties = { background: bg, color: slide.text_color };
    const hasImage = Boolean(slide.image_desktop_url);
    return (
        <div className="relative h-full w-full overflow-hidden bg-zinc-900" style={style}>
            {hasImage ? <img src={slide.image_desktop_url ?? ''} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            {slide.video_url ? <video src={slide.video_url} poster={slide.image_desktop_url ?? undefined} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" /> : null}
            {hasImage && slide.overlay_strength > 0 ? (
                <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(${slide.text_align === 'right' ? 'to left' : slide.text_align === 'center' ? 'to top' : 'to right'}, rgba(0,0,0,${slide.overlay_strength / 100}), rgba(0,0,0,0))` }}
                />
            ) : null}
            <div className={`absolute inset-0 flex flex-col justify-center gap-0.5 p-3 ${ALIGN[slide.text_align]}`}>
                {slide.eyebrow ? <span className="text-[10px] font-semibold">{slide.eyebrow}</span> : null}
                {slide.title ? <span className={`line-clamp-2 font-extrabold leading-tight ${big ? 'text-base sm:text-xl' : 'text-xs'}`}>{slide.title}</span> : null}
                {big && slide.subtitle ? <span className="line-clamp-2 max-w-xs text-[11px]">{slide.subtitle}</span> : null}
                {slide.cta_label ? (
                    <span
                        className={`mt-1 inline-flex w-fit items-center rounded-md font-bold ${big ? 'h-7 px-3 text-xs' : 'h-5 px-2 text-[10px]'}`}
                        style={{ backgroundColor: slide.cta_bg_color, color: slide.cta_text_color }}
                    >
                        {slide.cta_label}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

interface HeroPreviewProps {
    config: HeroConfig;
    slides: PreviewSlide[];
}

/** Static approximation of the storefront hero: first live main slide + tiles, using the draft settings. */
export function HeroPreview({ config, slides }: HeroPreviewProps) {
    const main = slides.filter((s) => s.placement === 'main');
    const tiles = slides.filter((s) => s.placement === 'tile').slice(0, TILE_LIMIT[config.layout]);
    const lead = main[0] ?? slides[0];
    const band = previewBackground(config.background_style === 'none' ? 'solid' : config.background_style, config.background_color, config.gradient_from, config.gradient_to, config.gradient_angle);
    const bleed = config.layout === 'full_bleed';
    const radius = config.rounded && !bleed ? 'rounded-md' : '';

    if (!lead) {
        return (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                Add a slide to see the preview.
            </div>
        );
    }

    const leadBox = (
        <div className={`overflow-hidden ${bleed ? 'aspect-[32/9]' : 'aspect-[21/9]'} ${radius}`}>
            <Tile slide={lead} big />
        </div>
    );
    const tileBox = (t: PreviewSlide) => (
        <div key={t.id} className={`min-h-0 flex-1 overflow-hidden ${radius}`}>
            <Tile slide={t} />
        </div>
    );

    let body = leadBox;
    if (tiles.length > 0) {
        if (config.layout === 'carousel_side' || config.layout === 'bento') {
            const bento = config.layout === 'bento';
            body = (
                <div className="grid grid-cols-12 gap-2">
                    <div className={bento ? 'col-span-6' : 'col-span-9'}>{leadBox}</div>
                    <div className={`grid gap-2 ${bento ? 'col-span-6 grid-cols-2 grid-rows-2' : 'col-span-3 grid-rows-2'}`}>
                        {tiles.map((t) => (
                            <div key={t.id} className={`overflow-hidden ${radius}`}>
                                <Tile slide={t} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        } else if (config.layout === 'tiles_below') {
            body = (
                <div className="space-y-2">
                    {leadBox}
                    <div className={`grid gap-2 ${COLS[tiles.length as 1 | 2 | 3 | 4]}`}>
                        {tiles.map((t) => (
                            <div key={t.id} className={`aspect-[16/7] overflow-hidden ${radius}`}>
                                <Tile slide={t} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        } else if (config.layout === 'flanked') {
            const left = tiles.slice(0, Math.ceil(tiles.length / 2));
            const right = tiles.slice(left.length);
            body = (
                <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3 flex flex-col gap-2">{left.map(tileBox)}</div>
                    <div className={right.length > 0 ? 'col-span-6' : 'col-span-9'}>{leadBox}</div>
                    {right.length > 0 ? <div className="col-span-3 flex flex-col gap-2">{right.map(tileBox)}</div> : null}
                </div>
            );
        }
    }

    return (
        <div className={`border border-border ${bleed ? '' : 'rounded-md p-3'}`} style={{ background: config.background_style === 'none' ? undefined : band }}>
            {body}
            {main.length > 1 ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    Showing slide 1 of {main.length}. {config.autoplay ? `Rotates every ${config.interval_seconds}s` : 'Autoplay off'}, {config.transition} transition.
                </p>
            ) : null}
        </div>
    );
}
