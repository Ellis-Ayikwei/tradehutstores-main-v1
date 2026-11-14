/**
 * Homepage hero admin API (Stores-BE apps/merchandising/hero_views.py):
 *   GET/POST   homepage/admin/hero/configs/                 heroes (name, layout, styling)
 *   GET/PATCH/DEL homepage/admin/hero/configs/{id}/         the live hero cannot be deleted (409)
 *   POST       homepage/admin/hero/configs/{id}/activate/   make that hero the live one
 *   GET/POST   homepage/admin/hero/slides/?hero={id}        multipart on POST, `hero` required
 *   PATCH/DEL  homepage/admin/hero/slides/{id}/             multipart on PATCH
 *   POST       homepage/admin/hero/slides/reorder/          { hero: number, ids: number[] }
 */
import axios from 'axios';
import axiosInstance from './axiosInstance';

export type HeroLayout = 'carousel' | 'carousel_side' | 'bento' | 'tiles_below' | 'flanked' | 'full_bleed';
export type HeroTransition = 'slide' | 'fade';
export type HeroBackgroundStyle = 'none' | 'solid' | 'gradient';
export type HeroPlacement = 'main' | 'tile';
export type HeroTextAlign = 'left' | 'center' | 'right';

export interface HeroConfig {
    id: number;
    name: string;
    /** True for the one hero the storefront shows. Changed only with `activateHero`. */
    is_active: boolean;
    layout: HeroLayout;
    autoplay: boolean;
    interval_seconds: number;
    transition: HeroTransition;
    show_arrows: boolean;
    show_dots: boolean;
    height_desktop: number;
    rounded: boolean;
    background_style: HeroBackgroundStyle;
    background_color: string;
    gradient_from: string;
    gradient_to: string;
    gradient_angle: number;
    updated_at?: string;
}

export interface HeroSlide {
    id: number;
    hero: number;
    name: string;
    placement: HeroPlacement;
    position: number;
    is_active: boolean;
    is_live: boolean;
    starts_at: string | null;
    ends_at: string | null;
    image_desktop_url: string | null;
    image_mobile_url: string | null;
    video_url: string | null;
    alt_text: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    cta_label: string;
    link_url: string;
    open_in_new_tab: boolean;
    cta_bg_color: string;
    cta_text_color: string;
    text_color: string;
    text_align: HeroTextAlign;
    overlay_strength: number;
    background_style: 'solid' | 'gradient';
    background_color: string;
    gradient_from: string;
    gradient_to: string;
    gradient_angle: number;
}

/** What the slide form edits. Files are sent only when set; `null` means "remove the saved image". */
export type HeroSlideDraft = Omit<HeroSlide, 'id' | 'hero' | 'position' | 'is_live' | 'image_desktop_url' | 'image_mobile_url' | 'video_url'> & {
    image_desktop: File | null | undefined;
    image_mobile: File | null | undefined;
    video: File | null | undefined;
};

const BASE = 'homepage/admin/hero/';

export class HeroApiError extends Error {
    fields: Record<string, string>;
    constructor(message: string, fields: Record<string, string> = {}) {
        super(message);
        this.fields = fields;
    }
}

function toApiError(err: unknown, fallback: string): HeroApiError {
    if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 403) return new HeroApiError('You do not have permission to change the homepage hero.');
        const data = err.response?.data;
        if (data && typeof data === 'object') {
            const fields: Record<string, string> = {};
            Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
                const text = Array.isArray(value) ? value.map(String).join(' ') : typeof value === 'string' ? value : '';
                if (text) fields[key] = text;
            });
            const first = Object.values(fields)[0];
            if (first) return new HeroApiError(first, fields);
        }
    }
    return new HeroApiError(fallback);
}

export async function fetchHeroes(): Promise<HeroConfig[]> {
    try {
        const { data } = await axiosInstance.get<HeroConfig[] | { results: HeroConfig[] }>(`${BASE}configs/`);
        return Array.isArray(data) ? data : data.results;
    } catch (err) {
        throw toApiError(err, 'Could not load the heroes.');
    }
}

export async function fetchHero(id: number): Promise<HeroConfig> {
    try {
        const { data } = await axiosInstance.get<HeroConfig>(`${BASE}configs/${id}/`);
        return data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) throw new HeroApiError('This hero no longer exists.');
        throw toApiError(err, 'Could not load this hero.');
    }
}

export async function createHero(name: string): Promise<HeroConfig> {
    try {
        const { data } = await axiosInstance.post<HeroConfig>(`${BASE}configs/`, { name });
        return data;
    } catch (err) {
        throw toApiError(err, 'Could not create the hero.');
    }
}

export async function saveHero(id: number, body: Partial<HeroConfig>): Promise<HeroConfig> {
    try {
        const { data } = await axiosInstance.patch<HeroConfig>(`${BASE}configs/${id}/`, body);
        return data;
    } catch (err) {
        throw toApiError(err, 'Could not save the hero settings.');
    }
}

export async function activateHero(id: number): Promise<HeroConfig> {
    try {
        const { data } = await axiosInstance.post<HeroConfig>(`${BASE}configs/${id}/activate/`);
        return data;
    } catch (err) {
        throw toApiError(err, 'Could not make this hero live.');
    }
}

export async function deleteHero(id: number): Promise<void> {
    try {
        await axiosInstance.delete(`${BASE}configs/${id}/`);
    } catch (err) {
        throw toApiError(err, 'Could not delete the hero.');
    }
}

export async function fetchHeroSlides(heroId: number): Promise<HeroSlide[]> {
    try {
        const { data } = await axiosInstance.get<HeroSlide[] | { results: HeroSlide[] }>(`${BASE}slides/`, { params: { hero: heroId } });
        return Array.isArray(data) ? data : data.results;
    } catch (err) {
        throw toApiError(err, 'Could not load the hero slides.');
    }
}

function buildSlideFormData(draft: Partial<HeroSlideDraft>): FormData {
    const fd = new FormData();
    Object.entries(draft).forEach(([key, value]) => {
        if (value === undefined) return;
        if (value instanceof File) fd.append(key, value);
        else if (value === null) fd.append(key, '');
        else if (typeof value === 'boolean') fd.append(key, value ? 'true' : 'false');
        else fd.append(key, String(value));
    });
    return fd;
}

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export async function createHeroSlide(heroId: number, draft: HeroSlideDraft): Promise<HeroSlide> {
    try {
        const body = buildSlideFormData(draft);
        body.append('hero', String(heroId));
        const { data } = await axiosInstance.post<HeroSlide>(`${BASE}slides/`, body, MULTIPART);
        return data;
    } catch (err) {
        throw toApiError(err, 'Could not create the slide.');
    }
}

export async function updateHeroSlide(id: number, draft: Partial<HeroSlideDraft>): Promise<HeroSlide> {
    try {
        const { data } = await axiosInstance.patch<HeroSlide>(`${BASE}slides/${id}/`, buildSlideFormData(draft), MULTIPART);
        return data;
    } catch (err) {
        throw toApiError(err, 'Could not save the slide.');
    }
}

export async function deleteHeroSlide(id: number): Promise<void> {
    try {
        await axiosInstance.delete(`${BASE}slides/${id}/`);
    } catch (err) {
        throw toApiError(err, 'Could not delete the slide.');
    }
}

export async function reorderHeroSlides(heroId: number, ids: number[]): Promise<HeroSlide[]> {
    try {
        const { data } = await axiosInstance.post<HeroSlide[]>(`${BASE}slides/reorder/`, { hero: heroId, ids });
        return data;
    } catch (err) {
        throw toApiError(err, 'Could not reorder the slides.');
    }
}

/** CSS background for the preview, mirroring the storefront. */
export function previewBackground(
    style: HeroBackgroundStyle | 'solid' | 'gradient',
    color: string,
    from: string,
    to: string,
    angle: number
): string | undefined {
    if (style === 'solid' && color) return color;
    if (style === 'gradient' && from && to) return `linear-gradient(${angle}deg, ${from}, ${to})`;
    return undefined;
}
