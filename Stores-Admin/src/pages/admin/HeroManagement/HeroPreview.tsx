import type { CSSProperties } from 'react';
import { previewBackground, type HeroConfig, type HeroSlide } from '@/services/heroAdminService';

type PreviewSlide = Pick<
    HeroSlide,
    | 'placement'
    | 'image_desktop_url'
    | 'eyebrow'
    | 'title'
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

function Tile({ slide, big }: { slide: PreviewSlide; big?: boolean }) {
    const bg = previewBackground(slide.background_style, slide.background_color, slide.gradient_from, slide.gradient_to, slide.gradient_angle);
    const style: CSSProperties = { background: bg, color: slide.text_color };
    return (
        <div className="relative h-full w-full overflow-hidden bg-zinc-900" style={style}>
            {slide.image_desktop_url ? (
                <>
                    <img src={slide.image_desktop_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    {slide.overlay_strength > 0 ? (
                        <div
                            className="absolute inset-0"
                            style={{ background: `linear-gradient(to right, rgba(0,0,0,${slide.overlay_strength / 100}), rgba(0,0,0,0))` }}
                        />
                    ) : null}
                </>
            ) : null}
            <div className={`absolute inset-0 flex flex-col justify-center gap-0.5 p-3 ${ALIGN[slide.text_align]}`}>
                {slide.eyebrow ? <span className="text-[10px] font-semibold">{slide.eyebrow}</span> : null}
                {slide.title ? (
                    <span className={`line-clamp-2 font-extrabold leading-tight ${big ? 'text-base sm:text-xl' : 'text-xs'}`}>{slide.title}</span>
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
    const tiles = slides.filter((s) => s.placement === 'tile').slice(0, config.layout === 'bento' ? 4 : 2);
    const lead = main[0] ?? slides[0];
    const band = previewBackground(config.background_style === 'none' ? 'solid' : config.background_style, config.background_color, config.gradient_from, config.gradient_to, config.gradient_angle);
    const radius = config.rounded ? 'rounded-md' : '';
    const showTiles = config.layout !== 'carousel' && tiles.length > 0;

    if (!lead) {
        return (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                Add a slide to see the preview.
            </div>
        );
    }

    const bento = config.layout === 'bento';
    return (
        <div className="rounded-md border border-border p-3" style={{ background: config.background_style === 'none' ? undefined : band }}>
            <div className={`grid gap-2 ${showTiles ? 'grid-cols-12' : 'grid-cols-1'}`}>
                <div className={`aspect-[21/9] overflow-hidden ${radius} ${showTiles ? (bento ? 'col-span-6' : 'col-span-9') : ''}`}>
                    <Tile slide={lead} big />
                </div>
                {showTiles ? (
                    <div className={`grid gap-2 ${bento ? 'col-span-6 grid-cols-2 grid-rows-2' : 'col-span-3 grid-rows-2'}`}>
                        {tiles.map((t) => (
                            <div key={t.id} className={`overflow-hidden ${radius}`}>
                                <Tile slide={t} />
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
            {main.length > 1 ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    Showing slide 1 of {main.length}. {config.autoplay ? `Rotates every ${config.interval_seconds}s` : 'Autoplay off'}, {config.transition} transition.
                </p>
            ) : null}
        </div>
    );
}
