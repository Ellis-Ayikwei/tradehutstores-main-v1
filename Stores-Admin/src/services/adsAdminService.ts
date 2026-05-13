/**
 * Staff ads API client. Requires Django user.is_staff + JWT.
 *
 * Endpoints:
 *   GET/POST/PATCH/DELETE  ads/admin/placements/
 *   GET/POST/PATCH/DELETE  ads/admin/campaigns/
 *   GET/POST/PATCH/DELETE  ads/admin/creatives/
 *   GET/POST/PATCH/DELETE  ads/admin/slots/
 */
import type { AxiosError } from 'axios';
import axiosInstance from './axiosInstance';

const PLACEMENTS = 'ads/admin/placements/';
const CAMPAIGNS = 'ads/admin/campaigns/';
const CREATIVES = 'ads/admin/creatives/';
const SLOTS = 'ads/admin/slots/';

// ── Types ───────────────────────────────────────────────────────────────────

export type PlacementFormat =
    | 'banner'
    | 'carousel'
    | 'modal'
    | 'topbar'
    | 'sidebar'
    | 'inline_card'
    | 'fullscreen';

export type CreativeFormat = 'image' | 'video' | 'html' | 'text';

export type CampaignStatus =
    | 'draft'
    | 'scheduled'
    | 'running'
    | 'paused'
    | 'ended'
    | 'archived';

export interface AdPlacement {
    id: number;
    slug: string;
    name: string;
    description: string;
    format: PlacementFormat;
    aspect_ratio: string;
    max_active_slots: number;
    rotation_seconds: number;
    is_active: boolean;
    active_slot_count: number;
    created_at: string;
    updated_at: string;
}

export interface PlacementWritePayload {
    slug: string;
    name: string;
    description: string;
    format: PlacementFormat;
    aspect_ratio: string;
    max_active_slots: number;
    rotation_seconds: number;
    is_active: boolean;
}

export interface Campaign {
    id: string;
    name: string;
    advertiser: string;
    seller: string | null;
    seller_name: string | null;
    status: CampaignStatus;
    priority: number;
    starts_at: string | null;
    ends_at: string | null;
    daily_impression_cap: number | null;
    total_impression_cap: number | null;
    is_live: boolean;
    creative_count: number;
    notes?: string;
    stats?: { impressions: number; clicks: number; ctr: number; window_days: number };
    created_at: string;
    updated_at: string;
}

export interface CampaignWritePayload {
    name: string;
    advertiser: string;
    seller: string | null;
    status: CampaignStatus;
    priority: number;
    starts_at: string | null;
    ends_at: string | null;
    daily_impression_cap: number | null;
    total_impression_cap: number | null;
    notes: string;
}

export interface Creative {
    id: string;
    campaign: string;
    campaign_name: string;
    name: string;
    format: CreativeFormat;
    image_desktop: string | null;
    image_desktop_url: string | null;
    image_mobile: string | null;
    image_mobile_url: string | null;
    video_url: string;
    html_body: string;
    headline: string;
    subheadline: string;
    eyebrow: string;
    cta_label: string;
    cta_url: string;
    open_in_new_tab: boolean;
    background_color: string;
    text_color: string;
    accent_color: string;
    alt_text: string;
    created_at: string;
    updated_at: string;
}

export interface CreativeWritePayload {
    campaign: string;
    name: string;
    format: CreativeFormat;
    image_desktop?: File | null;
    image_mobile?: File | null;
    video_url?: string;
    html_body?: string;
    headline?: string;
    subheadline?: string;
    eyebrow?: string;
    cta_label?: string;
    cta_url?: string;
    open_in_new_tab?: boolean;
    background_color?: string;
    text_color?: string;
    accent_color?: string;
    alt_text?: string;
}

export interface TargetingRulePayload {
    countries: string[];
    exclude_countries: string[];
    devices: string[];
    user_states: string[];
    languages: string[];
    categories: string[];
    min_cart_value: number | null;
    max_cart_value: number | null;
    only_with_empty_cart: boolean;
    path_includes: string[];
    path_excludes: string[];
    ab_bucket: string;
}

export interface AdSlotRow {
    id: string;
    placement: number;
    placement_name: string;
    placement_slug: string;
    creative: string;
    creative_name: string;
    is_active: boolean;
    is_live: boolean;
    weight: number;
    position_hint: number;
    starts_at: string | null;
    ends_at: string | null;
    dismissible: boolean;
    show_close_after_seconds: number;
    delay_seconds: number;
    cap_per_session: number;
    cap_per_day: number;
    cap_per_week: number;
    targeting: TargetingRulePayload | null;
    stats: { impressions: number; clicks: number; ctr: number };
    created_at: string;
    updated_at: string;
}

export interface AdSlotWritePayload {
    placement: number;
    creative: string;
    is_active: boolean;
    weight: number;
    position_hint: number;
    starts_at: string | null;
    ends_at: string | null;
    dismissible: boolean;
    show_close_after_seconds: number;
    delay_seconds: number;
    cap_per_session: number;
    cap_per_day: number;
    cap_per_week: number;
    targeting: TargetingRulePayload | null;
}

// ── Placements ──────────────────────────────────────────────────────────────

export async function fetchPlacements(): Promise<AdPlacement[]> {
    const { data } = await axiosInstance.get<AdPlacement[]>(PLACEMENTS);
    return Array.isArray(data) ? data : (data as { results?: AdPlacement[] }).results ?? [];
}

export async function createPlacement(body: PlacementWritePayload): Promise<AdPlacement> {
    const { data } = await axiosInstance.post<AdPlacement>(PLACEMENTS, body);
    return data;
}

export async function patchPlacement(
    id: number,
    body: Partial<PlacementWritePayload>
): Promise<AdPlacement> {
    const { data } = await axiosInstance.patch<AdPlacement>(`${PLACEMENTS}${id}/`, body);
    return data;
}

export async function deletePlacement(id: number): Promise<void> {
    await axiosInstance.delete(`${PLACEMENTS}${id}/`);
}

// ── Campaigns ───────────────────────────────────────────────────────────────

export async function fetchCampaigns(): Promise<Campaign[]> {
    const { data } = await axiosInstance.get<Campaign[]>(CAMPAIGNS);
    return Array.isArray(data) ? data : (data as { results?: Campaign[] }).results ?? [];
}

export async function fetchCampaignDetail(id: string): Promise<Campaign> {
    const { data } = await axiosInstance.get<Campaign>(`${CAMPAIGNS}${id}/`);
    return data;
}

export async function createCampaign(body: CampaignWritePayload): Promise<Campaign> {
    const { data } = await axiosInstance.post<Campaign>(CAMPAIGNS, body);
    return data;
}

export async function patchCampaign(
    id: string,
    body: Partial<CampaignWritePayload>
): Promise<Campaign> {
    const { data } = await axiosInstance.patch<Campaign>(`${CAMPAIGNS}${id}/`, body);
    return data;
}

export async function deleteCampaign(id: string): Promise<void> {
    await axiosInstance.delete(`${CAMPAIGNS}${id}/`);
}

// ── Creatives ───────────────────────────────────────────────────────────────

export async function fetchCreatives(campaignId?: string): Promise<Creative[]> {
    const url = campaignId ? `${CREATIVES}?campaign=${campaignId}` : CREATIVES;
    const { data } = await axiosInstance.get<Creative[]>(url);
    return Array.isArray(data) ? data : (data as { results?: Creative[] }).results ?? [];
}

export async function fetchCreative(id: string): Promise<Creative> {
    const { data } = await axiosInstance.get<Creative>(`${CREATIVES}${id}/`);
    return data;
}

function buildCreativeFormData(body: CreativeWritePayload): FormData {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (v instanceof File) {
            fd.append(k, v);
        } else if (typeof v === 'boolean') {
            fd.append(k, v ? 'true' : 'false');
        } else {
            fd.append(k, String(v));
        }
    });
    return fd;
}

export async function createCreative(body: CreativeWritePayload): Promise<Creative> {
    const fd = buildCreativeFormData(body);
    const { data } = await axiosInstance.post<Creative>(CREATIVES, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

export async function patchCreative(
    id: string,
    body: Partial<CreativeWritePayload>
): Promise<Creative> {
    const fd = buildCreativeFormData(body as CreativeWritePayload);
    const { data } = await axiosInstance.patch<Creative>(`${CREATIVES}${id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

export async function deleteCreative(id: string): Promise<void> {
    await axiosInstance.delete(`${CREATIVES}${id}/`);
}

// ── Slots ───────────────────────────────────────────────────────────────────

export interface SlotFilter {
    placement?: number;
    creative?: string;
    campaign?: string;
}

export async function fetchSlots(filter: SlotFilter = {}): Promise<AdSlotRow[]> {
    const params = new URLSearchParams();
    if (filter.placement) params.set('placement', String(filter.placement));
    if (filter.creative) params.set('creative', filter.creative);
    if (filter.campaign) params.set('campaign', filter.campaign);
    const url = params.toString() ? `${SLOTS}?${params}` : SLOTS;
    const { data } = await axiosInstance.get<AdSlotRow[]>(url);
    return Array.isArray(data) ? data : (data as { results?: AdSlotRow[] }).results ?? [];
}

export async function fetchSlot(id: string): Promise<AdSlotRow> {
    const { data } = await axiosInstance.get<AdSlotRow>(`${SLOTS}${id}/`);
    return data;
}

export async function createSlot(body: AdSlotWritePayload): Promise<AdSlotRow> {
    const { data } = await axiosInstance.post<AdSlotRow>(SLOTS, body);
    return data;
}

export async function patchSlot(
    id: string,
    body: Partial<AdSlotWritePayload>
): Promise<AdSlotRow> {
    const { data } = await axiosInstance.patch<AdSlotRow>(`${SLOTS}${id}/`, body);
    return data;
}

export async function deleteSlot(id: string): Promise<void> {
    await axiosInstance.delete(`${SLOTS}${id}/`);
}

export async function toggleSlot(id: string): Promise<AdSlotRow> {
    const { data } = await axiosInstance.post<AdSlotRow>(`${SLOTS}${id}/toggle/`);
    return data;
}

// ── Errors ──────────────────────────────────────────────────────────────────

export function adsAdminErrorMessage(err: unknown): string {
    const ax = err as AxiosError<{ detail?: string; [k: string]: unknown }>;
    if (ax.response?.data) {
        const d = ax.response.data as Record<string, unknown>;
        if (typeof d.detail === 'string') return d.detail;
        const first = Object.entries(d)[0];
        if (first && Array.isArray(first[1]) && typeof (first[1] as string[])[0] === 'string') {
            return `${first[0]}: ${(first[1] as string[])[0]}`;
        }
    }
    if (ax.response?.status === 403) {
        return 'Forbidden — your Django user must be is_staff to manage ads.';
    }
    return ax.message || 'Request failed';
}

export const PLACEMENT_FORMATS: { value: PlacementFormat; label: string }[] = [
    { value: 'banner', label: 'Banner (image strip)' },
    { value: 'carousel', label: 'Carousel (multi-image)' },
    { value: 'modal', label: 'Modal / popup' },
    { value: 'topbar', label: 'Top bar (sticky strip)' },
    { value: 'sidebar', label: 'Sidebar' },
    { value: 'inline_card', label: 'Inline card' },
    { value: 'fullscreen', label: 'Fullscreen overlay' },
];

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string; color: string }[] = [
    { value: 'draft', label: 'Draft', color: '#6b7280' },
    { value: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
    { value: 'running', label: 'Running', color: '#10b981' },
    { value: 'paused', label: 'Paused', color: '#f59e0b' },
    { value: 'ended', label: 'Ended', color: '#ef4444' },
    { value: 'archived', label: 'Archived', color: '#1f2937' },
];

export const CAMPAIGN_PRIORITIES = [
    { value: 1, label: 'Low' },
    { value: 5, label: 'Normal' },
    { value: 10, label: 'High' },
    { value: 20, label: 'Urgent (always wins)' },
];

export const DEVICE_OPTIONS = [
    { value: 'mobile', label: 'Mobile' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'desktop', label: 'Desktop' },
];

export const USER_STATE_OPTIONS = [
    { value: 'any', label: 'Any visitor' },
    { value: 'anon', label: 'Anonymous only' },
    { value: 'auth', label: 'Logged in only' },
    { value: 'buyer', label: 'Buyers only' },
    { value: 'seller', label: 'Sellers only' },
    { value: 'new_user', label: 'New users (<30d)' },
    { value: 'returning', label: 'Returning users' },
];

export const CREATIVE_FORMATS: { value: CreativeFormat; label: string }[] = [
    { value: 'image', label: 'Single image' },
    { value: 'video', label: 'Video' },
    { value: 'html', label: 'Custom HTML' },
    { value: 'text', label: 'Text-only' },
];

export function emptyTargeting(): TargetingRulePayload {
    return {
        countries: [],
        exclude_countries: [],
        devices: [],
        user_states: [],
        languages: [],
        categories: [],
        min_cart_value: null,
        max_cart_value: null,
        only_with_empty_cart: false,
        path_includes: [],
        path_excludes: [],
        ab_bucket: '',
    };
}
