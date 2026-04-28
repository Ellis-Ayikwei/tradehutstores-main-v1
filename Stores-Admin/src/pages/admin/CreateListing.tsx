// ─── CreateListing.tsx ──────────────────────────────────────────────────────
// 7-step wizard for creating a new product listing in TradeHut Seller Studio.
//
// Steps
//   1  Category & Basics  (Stitch: tradehut_create_listing_step_1)
//   2  Media & Gallery    (Stitch: tradehut_create_listing_step_1 — gallery section)
//   3  Pricing & Type     (Stitch: tradehut_create_listing_step_3_pricing)
//   4  Variants & Specs   (Stitch: tradehut_create_listing_step_4_variants)
//   5  Inventory          (Stitch: tradehut_create_listing_step_5_inventory)
//   6  Shipping           (Stitch: tradehut_create_listing_step_6_shipping)
//   7  Preview & Publish  (Stitch: tradehut_create_listing_step_7_preview)
//
// NOTE: Step 2 is a placeholder — Stitch design for "Product Details /
//       Description" was not provided in this batch.
//
// TODO: POST /api/listings/draft/  on every "Next" step transition
// TODO: POST /api/listings/publish/ on final Publish action

import React, { useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Variant {
    id: string;
    label: string;
    sku: string;
    additionalPrice: string;
}

interface InventoryRow {
    id: string;
    label: string;
    sku: string;
    qty: number;
}

interface ListingFormState {
    // Step 1 — Category & Basics
    title: string;
    category1: string;
    category2: string;
    category3: string;
    condition: 'new' | 'refurbished' | 'used';
    description: string;
    // Step 2 — Media & Gallery (placeholder)
    videoUrl: string;
    // Step 3 — Pricing
    listingType: 'fixed' | 'auction' | 'rfq';
    basePrice: string;
    taxCategory: string;
    allowOffers: boolean;
    auctionStartPrice: string;
    auctionReservePrice: string;
    auctionDurationDays: string;
    // Step 4 — Variants & Specs
    variants: Variant[];
    specMaterial: string;
    specWeight: string;
    specDimensions: string;
    // Step 5 — Inventory
    globalStock: number;
    inventoryRows: InventoryRow[];
    lowStockAlertEnabled: boolean;
    lowStockThreshold: number;
    visibleOnStorefront: boolean;
    dispatchLocation: string;
    binId: string;
    // Step 6 — Shipping
    packageWeightKg: string;
    dimL: string;
    dimW: string;
    dimH: string;
    shippingProfile: 'standard_global' | 'express_domestic';
    shippingServices: { dhl: boolean; fedex: boolean; local: boolean };
    handlingTime: string;
}

type FormAction =
    | { type: 'SET'; field: keyof ListingFormState; value: unknown }
    | { type: 'SET_VARIANT'; id: string; field: keyof Variant; value: string }
    | { type: 'ADD_VARIANT' }
    | { type: 'REMOVE_VARIANT'; id: string }
    | { type: 'SET_INVENTORY_QTY'; id: string; qty: number }
    | { type: 'TOGGLE_SHIPPING_SERVICE'; service: 'dhl' | 'fedex' | 'local' };

const initialState: ListingFormState = {
    title: '',
    category1: '',
    category2: '',
    category3: '',
    condition: 'new',
    description: '',
    videoUrl: '',
    listingType: 'fixed',
    basePrice: '',
    taxCategory: 'Standard Rate (20%)',
    allowOffers: false,
    auctionStartPrice: '',
    auctionReservePrice: '',
    auctionDurationDays: '7',
    variants: [
        { id: '1', label: 'Default', sku: 'TH-0001-DEF', additionalPrice: '0.00' },
    ],
    specMaterial: '',
    specWeight: '',
    specDimensions: '',
    globalStock: 0,
    inventoryRows: [
        { id: '1', label: 'Default Variant', sku: 'TH-0001-DEF', qty: 0 },
    ],
    lowStockAlertEnabled: true,
    lowStockThreshold: 5,
    visibleOnStorefront: true,
    dispatchLocation: 'Main Warehouse',
    binId: '',
    packageWeightKg: '',
    dimL: '',
    dimW: '',
    dimH: '',
    shippingProfile: 'standard_global',
    shippingServices: { dhl: true, fedex: false, local: false },
    handlingTime: '1-2 business days',
};

function formReducer(state: ListingFormState, action: FormAction): ListingFormState {
    switch (action.type) {
        case 'SET':
            return { ...state, [action.field]: action.value };
        case 'SET_VARIANT':
            return {
                ...state,
                variants: state.variants.map((v) =>
                    v.id === action.id ? { ...v, [action.field]: action.value } : v,
                ),
            };
        case 'ADD_VARIANT':
            return {
                ...state,
                variants: [
                    ...state.variants,
                    { id: Date.now().toString(), label: '', sku: '', additionalPrice: '0.00' },
                ],
                inventoryRows: [
                    ...state.inventoryRows,
                    { id: Date.now().toString(), label: 'New Variant', sku: '', qty: 0 },
                ],
            };
        case 'REMOVE_VARIANT':
            return {
                ...state,
                variants: state.variants.filter((v) => v.id !== action.id),
            };
        case 'SET_INVENTORY_QTY':
            return {
                ...state,
                inventoryRows: state.inventoryRows.map((r) =>
                    r.id === action.id ? { ...r, qty: action.qty } : r,
                ),
            };
        case 'TOGGLE_SHIPPING_SERVICE':
            return {
                ...state,
                shippingServices: {
                    ...state.shippingServices,
                    [action.service]: !state.shippingServices[action.service],
                },
            };
        default:
            return state;
    }
}

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEPS = [
    { num: 1, label: 'Category & Basics',    icon: 'category' },
    { num: 2, label: 'Media & Gallery',       icon: 'photo_library' },
    { num: 3, label: 'Pricing & Type',        icon: 'sell' },
    { num: 4, label: 'Variants & Specs',      icon: 'layers' },
    { num: 5, label: 'Inventory',             icon: 'inventory_2' },
    { num: 6, label: 'Shipping',              icon: 'local_shipping' },
    { num: 7, label: 'Preview & Publish',     icon: 'rocket_launch' },
];

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
            {children}
        </label>
    );
}

function TextInput({
    value,
    onChange,
    placeholder,
    type = 'text',
    className = '',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    className?: string;
}) {
    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container/30 focus:outline-none transition-all ${className}`}
        />
    );
}

function SelectInput({
    value,
    onChange,
    children,
    className = '',
}: {
    value: string;
    onChange: (v: string) => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container/30 focus:outline-none transition-all appearance-none ${className}`}
        >
            {children}
        </select>
    );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary-container' : 'bg-outline-variant/40'}`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
        </button>
    );
}

// ─── Progress stepper bar ─────────────────────────────────────────────────────

function StepperBar({ current }: { current: number }) {
    return (
        <div className="relative flex items-center justify-between mb-10 px-2">
            {/* connecting line behind dots */}
            <div className="absolute inset-x-0 top-4 h-0.5 bg-outline-variant/20 mx-8" />
            <div
                className="absolute top-4 h-0.5 bg-primary-container mx-8 transition-all duration-500"
                style={{ width: `calc(${((current - 1) / (STEPS.length - 1)) * 100}% - 4rem + 4rem * ${(current - 1) / (STEPS.length - 1)})` }}
            />
            {STEPS.map((s) => {
                const done = s.num < current;
                const active = s.num === current;
                return (
                    <div key={s.num} className="relative flex flex-col items-center z-10">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                                ${done ? 'bg-k-secondary text-white' : active ? 'bg-primary-container text-white ring-4 ring-primary-container/20 ring-offset-2' : 'bg-outline-variant/30 text-on-surface-variant'}`}
                        >
                            {done ? (
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                                    check
                                </span>
                            ) : (
                                s.num
                            )}
                        </div>
                        <span
                            className={`mt-2 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap hidden lg:block
                                ${active ? 'text-primary-container' : done ? 'text-k-secondary' : 'text-on-surface-variant/50'}`}
                        >
                            {s.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Sidebar stepper (desktop left panel) ────────────────────────────────────

function SidebarStepper({ current }: { current: number }) {
    return (
        <div className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-8 space-y-1 relative">
                {/* vertical line */}
                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-outline-variant/20" />
                {STEPS.map((s) => {
                    const done = s.num < current;
                    const active = s.num === current;
                    return (
                        <div key={s.num} className="relative flex items-center gap-4 py-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold z-10 flex-shrink-0 transition-all
                                    ${done ? 'bg-k-secondary text-white' : active ? 'bg-primary-container text-white ring-4 ring-primary-container/20 ring-offset-2' : 'bg-surface-container text-on-surface-variant/40 ring-4 ring-surface'}`}
                            >
                                {done ? (
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                                        check
                                    </span>
                                ) : (
                                    String(s.num).padStart(2, '0')
                                )}
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${active ? 'text-primary-container' : done ? 'text-on-surface/50' : 'text-on-surface-variant/40'}`}>
                                    {s.num}. {s.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Footer navigation bar ────────────────────────────────────────────────────

function WizardFooter({
    step,
    totalSteps,
    onBack,
    onNext,
    onDraft,
    onPublish,
    nextLabel,
}: {
    step: number;
    totalSteps: number;
    onBack: () => void;
    onNext: () => void;
    onDraft: () => void;
    onPublish: () => void;
    nextLabel?: string;
}) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 mt-8 border-t border-outline-variant/15">
            <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-outline/30 font-bold text-on-surface hover:bg-surface-container-low transition-all active:scale-95"
            >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onDraft}
                    className="px-6 py-3 rounded-xl border border-outline-variant/30 font-bold text-on-surface-variant hover:bg-surface-container-low transition-all active:scale-95 text-sm"
                >
                    Save as Draft
                </button>
                {step < totalSteps ? (
                    <button
                        type="button"
                        onClick={onNext}
                        className="flex items-center gap-2 px-8 py-3 bg-primary-container text-white rounded-xl font-bold text-sm shadow-card hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        {nextLabel ?? `Next: ${STEPS[step]?.label ?? ''}`}
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onPublish}
                        className="flex items-center gap-2 px-10 py-3 primary-gradient text-white rounded-xl font-bold text-sm shadow-card hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">rocket_launch</span>
                        Publish Listing
                    </button>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Category & Basics
// ═══════════════════════════════════════════════════════════════════════════════

function StepCategory({
    form,
    dispatch,
}: {
    form: ListingFormState;
    dispatch: React.Dispatch<FormAction>;
}) {
    const conditions = [
        { value: 'new', icon: 'new_releases', label: 'New' },
        { value: 'refurbished', icon: 'build', label: 'Refurbished' },
        { value: 'used', icon: 'history', label: 'Used' },
    ] as const;

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-on-surface">Listing Basics</h3>
                <p className="text-on-surface-variant text-sm mt-1">
                    Provide the fundamental identity for your listing.
                </p>
            </div>

            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-card space-y-8">
                {/* Title */}
                <div>
                    <FieldLabel>Listing Title</FieldLabel>
                    <TextInput
                        value={form.title}
                        onChange={(v) => dispatch({ type: 'SET', field: 'title', value: v })}
                        placeholder="e.g. Industrial Desk Lamp — Limited Edition"
                    />
                </div>

                {/* Category grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['category1', 'category2', 'category3'] as const).map((field, i) => (
                        <div key={field}>
                            <FieldLabel>Level {i + 1} Category</FieldLabel>
                            <SelectInput
                                value={form[field]}
                                onChange={(v) => dispatch({ type: 'SET', field, value: v })}
                            >
                                {i === 0 && <option value="">Select…</option>}
                                {i === 0 && <option>Home &amp; Living</option>}
                                {i === 0 && <option>Electronics</option>}
                                {i === 0 && <option>Industrial</option>}
                                {i === 1 && <option value="">Select…</option>}
                                {i === 1 && <option>Lighting</option>}
                                {i === 1 && <option>Furniture</option>}
                                {i === 2 && <option value="">Select…</option>}
                                {i === 2 && <option>Desk Lamps</option>}
                                {i === 2 && <option>Floor Lamps</option>}
                            </SelectInput>
                        </div>
                    ))}
                </div>

                {/* Condition */}
                <div>
                    <FieldLabel>Condition</FieldLabel>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {conditions.map(({ value, icon, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => dispatch({ type: 'SET', field: 'condition', value })}
                                className={`flex-1 py-4 px-5 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all active:scale-95
                                    ${form.condition === value
                                        ? 'border-primary-container bg-primary-container/5 text-primary-container'
                                        : 'border-transparent bg-surface-container-low text-on-surface-variant hover:border-outline-variant'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">{icon}</span>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div>
                    <FieldLabel>Product Description</FieldLabel>
                    <div className="border-2 border-transparent bg-surface-container-low rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-container/20">
                        {/* Toolbar */}
                        <div className="bg-surface-container border-b border-outline-variant/20 p-2 flex gap-2">
                            {['format_bold', 'format_italic', 'format_list_bulleted', 'link'].map((icon, idx) => (
                                <React.Fragment key={icon}>
                                    {idx === 3 && <div className="w-px h-6 bg-outline-variant/40 mx-1 self-center" />}
                                    <button
                                        type="button"
                                        className="p-2 hover:bg-surface-container-highest rounded transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm text-on-surface-variant">{icon}</span>
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                        <textarea
                            rows={5}
                            value={form.description}
                            onChange={(e) => dispatch({ type: 'SET', field: 'description', value: e.target.value })}
                            placeholder="Describe the story, materials, and soul of your product…"
                            className="w-full bg-transparent border-none px-6 py-4 text-sm focus:ring-0 focus:outline-none placeholder:italic placeholder:text-on-surface-variant/50 resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Media & Gallery
// ═══════════════════════════════════════════════════════════════════════════════

function StepDetails({
    form,
    dispatch,
}: {
    form: ListingFormState;
    dispatch: React.Dispatch<FormAction>;
}) {
    // TODO: step 2 Stitch design pending — likely product details / description.
    // Placeholder implementation covers the media/gallery section extracted
    // from step 1 of the Stitch source.

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-on-surface">Gallery &amp; Media</h3>
                <p className="text-on-surface-variant text-sm mt-1">
                    Visual narrative is everything. High-resolution imagery increases conversion.
                </p>
            </div>

            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-card space-y-8">
                {/* Dropzone */}
                <div className="border-2 border-dashed border-outline-variant rounded-2xl p-10 flex flex-col items-center justify-center bg-surface-container-low/30 hover:bg-surface-container-low transition-all cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-primary-container text-4xl">cloud_upload</span>
                    </div>
                    <p className="text-lg font-bold text-on-surface">Drag &amp; Drop Assets</p>
                    <p className="text-on-surface-variant text-sm mt-1">PNG, JPG, HEIC up to 20MB</p>
                    <button
                        type="button"
                        className="mt-6 px-8 py-3 bg-on-surface text-surface rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
                    >
                        Browse Files
                    </button>
                </div>

                {/* Image queue grid */}
                <div>
                    <div className="flex justify-between items-end mb-3">
                        <FieldLabel>Image Queue (0/10)</FieldLabel>
                        <span className="text-[10px] font-mono text-primary-container bg-primary-fixed px-2 py-1 rounded">OPTIMISED FOR 4:5</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {/* Main cover */}
                        <div className="col-span-1 sm:col-span-2 row-span-2 aspect-square rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col items-center justify-center text-outline-variant relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 to-transparent" />
                            <span className="material-symbols-outlined text-4xl mb-1">image</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Main Cover</span>
                        </div>
                        {/* Placeholder slots */}
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="aspect-square rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-center text-outline-variant/50 hover:border-primary-container/30 hover:bg-surface-container transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined">add</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Video URL */}
                <div>
                    <FieldLabel>Product Video URL (Optional)</FieldLabel>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">play_circle</span>
                            <input
                                type="text"
                                value={form.videoUrl}
                                onChange={(e) => dispatch({ type: 'SET', field: 'videoUrl', value: e.target.value })}
                                placeholder="https://youtube.com/v/…"
                                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 pl-12 text-sm focus:ring-2 focus:ring-primary-container/30 focus:outline-none transition-all"
                            />
                        </div>
                        <button
                            type="button"
                            className="px-5 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container-highest transition-colors active:scale-95"
                        >
                            Fetch
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Pricing & Type
// ═══════════════════════════════════════════════════════════════════════════════

function StepPricing({
    form,
    dispatch,
}: {
    form: ListingFormState;
    dispatch: React.Dispatch<FormAction>;
}) {
    const typeOptions = [
        {
            value: 'fixed' as const,
            icon: 'label_important',
            label: 'Fixed Price',
            desc: 'Sell at a set amount. Best for standard retail items.',
        },
        {
            value: 'auction' as const,
            icon: 'gavel',
            label: 'Auction',
            desc: 'Highest bidder wins. Perfect for rare or high-demand items.',
        },
        {
            value: 'rfq' as const,
            icon: 'request_quote',
            label: 'RFQ Only',
            desc: 'Accept custom quotes for bulk or bespoke orders.',
        },
    ];

    const borderByType = {
        fixed: 'border-primary-container',
        auction: 'border-k-secondary',
        rfq: 'border-tertiary',
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-on-surface">Pricing &amp; Type</h3>
                <p className="text-on-surface-variant text-sm mt-1">
                    Define how you want to sell your item. Choose between fixed pricing, competitive bidding, or direct negotiation.
                </p>
            </div>

            {/* Sale format selection */}
            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-card">
                <h4 className="text-lg font-bold mb-5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-container">sell</span>
                    Choose Sale Format
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {typeOptions.map(({ value, icon, label, desc }) => (
                        <label key={value} className="relative cursor-pointer group">
                            <input
                                type="radio"
                                name="listing_type"
                                value={value}
                                checked={form.listingType === value}
                                onChange={() => dispatch({ type: 'SET', field: 'listingType', value })}
                                className="sr-only"
                            />
                            <div
                                className={`p-6 h-full rounded-2xl border-2 transition-all
                                    ${form.listingType === value
                                        ? `${borderByType[value]} bg-white shadow-card`
                                        : 'border-transparent bg-surface-container-low hover:border-outline-variant'
                                    }`}
                            >
                                <span className={`material-symbols-outlined mb-3 text-3xl block transition-colors
                                    ${form.listingType === value
                                        ? value === 'fixed' ? 'text-primary-container' : value === 'auction' ? 'text-k-secondary' : 'text-tertiary'
                                        : 'text-on-surface-variant'
                                    }`}>
                                    {icon}
                                </span>
                                <p className="font-bold text-base mb-1">{label}</p>
                                <p className="text-xs text-on-surface-variant leading-snug">{desc}</p>
                            </div>
                            {form.listingType === value && (
                                <div className="absolute top-3 right-3">
                                    <span
                                        className={`material-symbols-outlined
                                            ${value === 'fixed' ? 'text-primary-container' : value === 'auction' ? 'text-k-secondary' : 'text-tertiary'}`}
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                        check_circle
                                    </span>
                                </div>
                            )}
                        </label>
                    ))}
                </div>
            </div>

            {/* Fixed price details */}
            {form.listingType === 'fixed' && (
                <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-card space-y-6">
                    <h4 className="text-lg font-bold">Fixed Price Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <FieldLabel>Base Price</FieldLabel>
                            <div className="relative flex items-center">
                                <span className="absolute left-4 font-mono text-on-surface-variant font-bold text-sm">$</span>
                                <input
                                    type="text"
                                    value={form.basePrice}
                                    onChange={(e) => dispatch({ type: 'SET', field: 'basePrice', value: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-8 pr-4 font-mono text-lg focus:ring-2 focus:ring-primary-container/20 focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Tax Category</FieldLabel>
                            <SelectInput
                                value={form.taxCategory}
                                onChange={(v) => dispatch({ type: 'SET', field: 'taxCategory', value: v })}
                            >
                                <option>Standard Rate (20%)</option>
                                <option>Reduced Rate (5%)</option>
                                <option>Zero Rated (0%)</option>
                                <option>Exempt</option>
                            </SelectInput>
                        </div>
                    </div>
                    {/* Allow offers toggle */}
                    <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-2xl">
                        <div className="flex gap-4 items-center">
                            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                                <span className="material-symbols-outlined text-primary-container">handshake</span>
                            </div>
                            <div>
                                <p className="font-bold text-sm">Allow Offers</p>
                                <p className="text-xs text-on-surface-variant">Allow buyers to suggest a different price for your review.</p>
                            </div>
                        </div>
                        <Toggle
                            checked={form.allowOffers}
                            onChange={(v) => dispatch({ type: 'SET', field: 'allowOffers', value: v })}
                        />
                    </div>
                </div>
            )}

            {/* Auction config */}
            {form.listingType === 'auction' && (
                <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-card space-y-6">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-k-secondary">gavel</span>
                        Auction Configuration
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <FieldLabel>Starting Bid ($)</FieldLabel>
                            <div className="relative flex items-center">
                                <span className="absolute left-4 font-mono text-on-surface-variant font-bold text-sm">$</span>
                                <input
                                    type="text"
                                    value={form.auctionStartPrice}
                                    onChange={(e) => dispatch({ type: 'SET', field: 'auctionStartPrice', value: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-8 pr-4 font-mono text-lg focus:ring-2 focus:ring-k-secondary/20 focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Reserve Price ($)</FieldLabel>
                            <div className="relative flex items-center">
                                <span className="absolute left-4 font-mono text-on-surface-variant font-bold text-sm">$</span>
                                <input
                                    type="text"
                                    value={form.auctionReservePrice}
                                    onChange={(e) => dispatch({ type: 'SET', field: 'auctionReservePrice', value: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-8 pr-4 font-mono text-lg focus:ring-2 focus:ring-k-secondary/20 focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Duration (days)</FieldLabel>
                            <SelectInput
                                value={form.auctionDurationDays}
                                onChange={(v) => dispatch({ type: 'SET', field: 'auctionDurationDays', value: v })}
                            >
                                {['1', '3', '5', '7', '10', '14'].map((d) => (
                                    <option key={d} value={d}>{d} day{d !== '1' ? 's' : ''}</option>
                                ))}
                            </SelectInput>
                        </div>
                    </div>
                </div>
            )}

            {/* RFQ config */}
            {form.listingType === 'rfq' && (
                <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-card space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-tertiary">request_quote</span>
                        RFQ Configuration
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <FieldLabel>Min. Quote Quantity</FieldLabel>
                            <TextInput value="" onChange={() => {}} placeholder="e.g. 100 units" />
                        </div>
                        <div>
                            <FieldLabel>Quote Deadline (days)</FieldLabel>
                            <TextInput value="" onChange={() => {}} placeholder="e.g. 14" type="number" />
                        </div>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                        Buyers will submit custom quote requests. You review and accept quotes manually.
                    </p>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Variants & Specs
// ═══════════════════════════════════════════════════════════════════════════════

function StepVariants({
    form,
    dispatch,
}: {
    form: ListingFormState;
    dispatch: React.Dispatch<FormAction>;
}) {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-on-surface">Variants &amp; Specs</h3>
                <p className="text-on-surface-variant text-sm mt-1">
                    Define product variations and provide technical data for professional buyers.
                </p>
            </div>

            {/* Product variants table */}
            <div className="bg-surface-container-low rounded-xl p-6 md:p-8 shadow-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                    <div>
                        <h4 className="text-lg font-bold mb-0.5">Product Variants</h4>
                        <p className="text-sm text-on-surface-variant">Add variations like colour, size, or material.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => dispatch({ type: 'ADD_VARIANT' })}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-white rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Variant
                    </button>
                </div>

                {/* Responsive table: full on lg+, card stack on mobile */}
                <div className="hidden lg:block overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container-high border-b border-outline-variant/10">
                                {['Variant Label', 'SKU Identifier', 'Additional Price ($)', ''].map((h) => (
                                    <th key={h} className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {form.variants.map((v) => (
                                <tr key={v.id} className="hover:bg-surface-container-low/40 transition-colors">
                                    <td className="px-5 py-4">
                                        <input
                                            type="text"
                                            value={v.label}
                                            onChange={(e) => dispatch({ type: 'SET_VARIANT', id: v.id, field: 'label', value: e.target.value })}
                                            placeholder="e.g. Midnight Blue / Large"
                                            className="bg-surface-container-low border-none rounded-lg text-sm px-3 py-2 w-full focus:ring-1 focus:ring-primary-container/20 focus:bg-white transition-all"
                                        />
                                    </td>
                                    <td className="px-5 py-4">
                                        <input
                                            type="text"
                                            value={v.sku}
                                            onChange={(e) => dispatch({ type: 'SET_VARIANT', id: v.id, field: 'sku', value: e.target.value })}
                                            placeholder="TH-0000-XX-YY"
                                            className="bg-surface-container-low border-none rounded-lg font-mono text-sm px-3 py-2 w-full focus:ring-1 focus:ring-primary-container/20 focus:bg-white transition-all"
                                        />
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-on-surface-variant font-mono text-sm">+$</span>
                                            <input
                                                type="text"
                                                value={v.additionalPrice}
                                                onChange={(e) => dispatch({ type: 'SET_VARIANT', id: v.id, field: 'additionalPrice', value: e.target.value })}
                                                className="bg-surface-container-low border-none rounded-lg font-mono text-sm px-3 py-2 w-24 focus:ring-1 focus:ring-primary-container/20 focus:bg-white transition-all"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => dispatch({ type: 'REMOVE_VARIANT', id: v.id })}
                                            className="p-2 text-error hover:bg-error-container rounded-lg transition-colors active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete_outline</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile card list */}
                <div className="lg:hidden space-y-3">
                    {form.variants.map((v) => (
                        <div key={v.id} className="bg-surface-container-lowest rounded-xl p-4 space-y-3 border border-outline-variant/10">
                            <div>
                                <FieldLabel>Variant Label</FieldLabel>
                                <input
                                    type="text"
                                    value={v.label}
                                    onChange={(e) => dispatch({ type: 'SET_VARIANT', id: v.id, field: 'label', value: e.target.value })}
                                    placeholder="e.g. Midnight Blue / Large"
                                    className="w-full bg-surface-container-low border-none rounded-lg text-sm px-3 py-2 focus:ring-1 focus:ring-primary-container/20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FieldLabel>SKU</FieldLabel>
                                    <input
                                        type="text"
                                        value={v.sku}
                                        onChange={(e) => dispatch({ type: 'SET_VARIANT', id: v.id, field: 'sku', value: e.target.value })}
                                        className="w-full bg-surface-container-low border-none rounded-lg font-mono text-sm px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <FieldLabel>+Price</FieldLabel>
                                    <input
                                        type="text"
                                        value={v.additionalPrice}
                                        onChange={(e) => dispatch({ type: 'SET_VARIANT', id: v.id, field: 'additionalPrice', value: e.target.value })}
                                        className="w-full bg-surface-container-low border-none rounded-lg font-mono text-sm px-3 py-2"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => dispatch({ type: 'REMOVE_VARIANT', id: v.id })}
                                className="flex items-center gap-1 text-error text-xs font-bold hover:bg-error-container px-2 py-1 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">delete_outline</span>
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Technical specs */}
            <div className="bg-surface-container-low rounded-xl p-6 md:p-8 shadow-card">
                <div className="mb-6">
                    <h4 className="text-lg font-bold mb-0.5">Technical Specifications</h4>
                    <p className="text-sm text-on-surface-variant">Provide precise data points for technical comparison.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <FieldLabel>Material Composition</FieldLabel>
                            <TextInput
                                value={form.specMaterial}
                                onChange={(v) => dispatch({ type: 'SET', field: 'specMaterial', value: v })}
                                placeholder="e.g. 85% Recycled Polyester, 15% Elastane"
                            />
                        </div>
                        <div>
                            <FieldLabel>Operating Weight</FieldLabel>
                            <TextInput
                                value={form.specWeight}
                                onChange={(v) => dispatch({ type: 'SET', field: 'specWeight', value: v })}
                                placeholder="e.g. 1.24 kg"
                            />
                        </div>
                        <div>
                            <FieldLabel>Dimensions (L×W×H)</FieldLabel>
                            <TextInput
                                value={form.specDimensions}
                                onChange={(v) => dispatch({ type: 'SET', field: 'specDimensions', value: v })}
                                placeholder="e.g. 45cm × 30cm × 15cm"
                            />
                        </div>
                    </div>

                    {/* Custom attribute placeholder */}
                    <div className="bg-surface-container rounded-xl p-6 flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 text-center">
                        <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-primary-container">data_object</span>
                        </div>
                        <h5 className="font-bold text-sm mb-1">Custom Attribute</h5>
                        <p className="text-xs text-on-surface-variant mb-4">
                            Add industry-specific specs (e.g. Voltage, Tensile Strength)
                        </p>
                        <button
                            type="button"
                            className="flex items-center gap-2 px-5 py-2 bg-on-surface text-surface rounded-lg font-bold text-xs hover:opacity-90 active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Add Specification
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Inventory
// ═══════════════════════════════════════════════════════════════════════════════

function StepInventory({
    form,
    dispatch,
}: {
    form: ListingFormState;
    dispatch: React.Dispatch<FormAction>;
}) {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-on-surface">Inventory Management</h3>
                <p className="text-on-surface-variant text-sm mt-1">
                    Configure stock levels, warehouse routing, and automated alerts.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main stock section */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-card border border-outline-variant/5">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary-container">inventory_2</span>
                                <h4 className="text-lg font-bold">Stock Availability</h4>
                            </div>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-secondary-fixed rounded-full text-on-secondary-fixed text-xs font-bold">
                                <span className="w-2 h-2 bg-on-secondary-fixed rounded-full" />
                                Live Sync
                            </span>
                        </div>

                        {/* Global stock */}
                        <div className="mb-6 p-5 bg-surface-container-low rounded-lg border border-primary-fixed/20">
                            <FieldLabel>Global Inventory Pool</FieldLabel>
                            <div className="flex items-end gap-4 mt-2">
                                <div className="flex-1 relative">
                                    <input
                                        type="number"
                                        value={form.globalStock}
                                        onChange={(e) =>
                                            dispatch({ type: 'SET', field: 'globalStock', value: Number(e.target.value) })
                                        }
                                        className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary-container rounded-lg px-4 py-3 font-mono text-2xl font-bold transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm font-bold">UNITS</span>
                                </div>
                            </div>
                        </div>

                        {/* Variant allocation */}
                        <div>
                            <h5 className="text-sm font-bold text-on-surface mb-3">Variant-Specific Allocation</h5>
                            <div className="space-y-2">
                                {form.inventoryRows.map((row) => (
                                    <div
                                        key={row.id}
                                        className="flex items-center justify-between p-4 bg-white border border-outline-variant/10 rounded-lg shadow-sm hover:border-primary-container/20 transition-all"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-on-surface">{row.label}</p>
                                            <p className="text-xs font-mono text-on-surface-variant/60">{row.sku}</p>
                                        </div>
                                        <input
                                            type="number"
                                            value={row.qty}
                                            onChange={(e) =>
                                                dispatch({ type: 'SET_INVENTORY_QTY', id: row.id, qty: Number(e.target.value) })
                                            }
                                            className="w-28 bg-surface-container-low border-none focus:ring-1 focus:ring-primary-container rounded px-3 py-2 font-mono text-right font-bold text-on-surface"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar panels */}
                <div className="lg:col-span-4 space-y-5">
                    {/* Low stock alert */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-card border border-outline-variant/5">
                        <div className="flex items-center justify-between mb-4">
                            <h5 className="font-bold text-sm">Low Stock Alert</h5>
                            <Toggle
                                checked={form.lowStockAlertEnabled}
                                onChange={(v) => dispatch({ type: 'SET', field: 'lowStockAlertEnabled', value: v })}
                            />
                        </div>
                        <p className="text-xs text-on-surface-variant mb-3">
                            Notify when stock falls below a threshold for any variant.
                        </p>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary-container text-xl">warning</span>
                            <input
                                type="number"
                                value={form.lowStockThreshold}
                                onChange={(e) =>
                                    dispatch({ type: 'SET', field: 'lowStockThreshold', value: Number(e.target.value) })
                                }
                                className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-lg pl-10 pr-16 py-2.5 font-mono font-bold text-primary-container"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary-container/40">UNITS</span>
                        </div>
                    </div>

                    {/* Visibility */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-card border border-outline-variant/5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-k-secondary">visibility</span>
                            <h5 className="font-bold text-sm">Visibility</h5>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-k-secondary/5 rounded-lg">
                            <span className="text-sm font-medium text-k-secondary">Visible on Storefront</span>
                            <Toggle
                                checked={form.visibleOnStorefront}
                                onChange={(v) => dispatch({ type: 'SET', field: 'visibleOnStorefront', value: v })}
                            />
                        </div>
                    </div>

                    {/* Fulfillment */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-card border border-outline-variant/5">
                        <h5 className="font-bold text-sm mb-4">Fulfillment Details</h5>
                        <div className="space-y-4">
                            <div>
                                <FieldLabel>Dispatch Location</FieldLabel>
                                <SelectInput
                                    value={form.dispatchLocation}
                                    onChange={(v) => dispatch({ type: 'SET', field: 'dispatchLocation', value: v })}
                                >
                                    <option>Main Warehouse</option>
                                    <option>Secondary Hub</option>
                                    <option>Local Workshop</option>
                                </SelectInput>
                            </div>
                            <div>
                                <FieldLabel>Bin / Storage ID (Optional)</FieldLabel>
                                <TextInput
                                    value={form.binId}
                                    onChange={(v) => dispatch({ type: 'SET', field: 'binId', value: v })}
                                    placeholder="e.g. A4-R12"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6 — Shipping
// ═══════════════════════════════════════════════════════════════════════════════

function StepShipping({
    form,
    dispatch,
}: {
    form: ListingFormState;
    dispatch: React.Dispatch<FormAction>;
}) {
    const shippingServicesList = [
        { key: 'dhl' as const, label: 'DHL Express', subtitle: 'Recommended for high-value goods', icon: 'local_shipping' },
        { key: 'fedex' as const, label: 'FedEx International', subtitle: 'Reliable global fulfillment', icon: 'flight_takeoff' },
        { key: 'local' as const, label: 'Local Courier', subtitle: 'Eco-friendly inner-city delivery', icon: 'eco' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-on-surface">Shipping Configuration</h3>
                <p className="text-on-surface-variant text-sm mt-1">
                    Define how your listing reaches buyers. TradeHut handles high-value logistics with integrated tracking.
                </p>
            </div>

            {/* Package details */}
            <div className="space-y-4">
                <h4 className="text-lg font-bold border-b border-outline-variant/20 pb-2">Package Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Weight */}
                    <div className="bg-surface-container-low p-5 rounded-xl space-y-3">
                        <FieldLabel>Weight</FieldLabel>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.packageWeightKg}
                                onChange={(e) => dispatch({ type: 'SET', field: 'packageWeightKg', value: e.target.value })}
                                placeholder="0.00"
                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-3 font-mono text-lg focus:ring-1 focus:ring-primary-container focus:outline-none transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-on-surface-variant/40">kg</span>
                        </div>
                    </div>

                    {/* Dimensions */}
                    <div className="md:col-span-2 bg-surface-container-low p-5 rounded-xl space-y-3">
                        <FieldLabel>Dimensions (L × W × H) in cm</FieldLabel>
                        <div className="grid grid-cols-3 gap-3">
                            {(
                                [
                                    ['dimL', 'L'],
                                    ['dimW', 'W'],
                                    ['dimH', 'H'],
                                ] as const
                            ).map(([field, axis]) => (
                                <div key={field} className="relative">
                                    <input
                                        type="text"
                                        value={form[field]}
                                        onChange={(e) => dispatch({ type: 'SET', field, value: e.target.value })}
                                        placeholder={axis === 'L' ? '60' : axis === 'W' ? '45' : '30'}
                                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-3 font-mono text-lg focus:ring-1 focus:ring-primary-container focus:outline-none transition-all"
                                    />
                                    <span className="absolute left-2 -top-2 px-1 bg-surface-container-low text-[10px] font-bold text-on-surface-variant/50">
                                        {axis}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Shipping profile */}
            <div className="space-y-4">
                <h4 className="text-lg font-bold border-b border-outline-variant/20 pb-2">Shipping Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        {
                            key: 'standard_global' as const,
                            label: 'Standard Global',
                            desc: 'Covers 48 regions, duties unpaid (DDU)',
                            tags: ['INTL_ECONOMY', 'TRACKED'],
                        },
                        {
                            key: 'express_domestic' as const,
                            label: 'Express Domestic',
                            desc: 'Next-day arrival for localised sellers',
                            tags: ['DOM_EXPRESS'],
                        },
                    ].map(({ key, label, desc, tags }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => dispatch({ type: 'SET', field: 'shippingProfile', value: key })}
                            className={`p-5 rounded-xl text-left relative overflow-hidden transition-all active:scale-[0.99]
                                ${form.shippingProfile === key
                                    ? 'bg-primary-fixed border-2 border-primary-container shadow-card'
                                    : 'bg-surface-container-lowest border border-outline-variant/20 hover:shadow-card'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h5 className="font-bold text-sm text-on-surface">{label}</h5>
                                    <p className="text-xs text-on-surface-variant/70 mt-0.5">{desc}</p>
                                </div>
                                {form.shippingProfile === key && (
                                    <span
                                        className="material-symbols-outlined text-primary-container"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                        check_circle
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((t) => (
                                    <span
                                        key={t}
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold
                                            ${form.shippingProfile === key ? 'bg-white text-primary-container' : 'bg-surface-container-low text-on-surface-variant/60'}`}
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Services & handling */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                    <h4 className="text-lg font-bold border-b border-outline-variant/20 pb-2">Shipping Services</h4>
                    <div className="space-y-2">
                        {shippingServicesList.map(({ key, label, subtitle, icon }) => (
                            <label
                                key={key}
                                className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                        <span className="material-symbols-outlined text-on-surface-variant/60">{icon}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{label}</p>
                                        <p className="text-[10px] text-on-surface-variant/60 uppercase">{subtitle}</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={form.shippingServices[key]}
                                    onChange={() => dispatch({ type: 'TOGGLE_SHIPPING_SERVICE', service: key })}
                                    className="w-5 h-5 rounded text-primary-container focus:ring-primary-container border-outline-variant"
                                />
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-lg font-bold border-b border-outline-variant/20 pb-2">Handling</h4>
                    <div className="p-5 bg-surface-container-low rounded-xl">
                        <FieldLabel>Handling Time</FieldLabel>
                        <SelectInput
                            value={form.handlingTime}
                            onChange={(v) => dispatch({ type: 'SET', field: 'handlingTime', value: v })}
                            className="mt-2"
                        >
                            <option>1-2 business days</option>
                            <option>3-5 business days</option>
                            <option>Same day dispatch</option>
                            <option>Pre-order (up to 30 days)</option>
                        </SelectInput>
                        <p className="mt-3 text-[10px] text-on-surface-variant leading-relaxed italic">
                            Most sellers choose 1-2 days to maximise buyer trust.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 7 — Preview & Publish
// ═══════════════════════════════════════════════════════════════════════════════

function StepPreview({
    form,
    onPublish,
    onDraft,
}: {
    form: ListingFormState;
    onPublish: () => void;
    onDraft: () => void;
}) {
    const sellerFeeRate = 0.02;
    const baseNum = parseFloat(form.basePrice.replace(/[^0-9.]/g, '')) || 0;
    const sellerFee = baseNum * sellerFeeRate;
    const youReceive = baseNum - sellerFee;

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold italic text-on-surface">Preview &amp; Publish</h3>
                <p className="text-on-surface-variant text-sm mt-1">
                    Review your listing details before going live on TradeHut.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left: details */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Listing summary */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-bold uppercase tracking-widest text-primary-container">Listing Summary</h4>
                            <button type="button" className="text-primary-container text-xs font-bold flex items-center gap-1 hover:underline active:scale-95">
                                <span className="material-symbols-outlined text-sm">edit</span>Edit
                            </button>
                        </div>
                        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card">
                            <div className="flex flex-col sm:flex-row gap-6 items-start">
                                <div className="w-full sm:w-36 aspect-square rounded-xl bg-surface-container-low flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">image</span>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider rounded-full">
                                            {form.category1 || 'Category'}
                                        </span>
                                        <h3 className="font-bold text-xl mt-2 tracking-tight">
                                            {form.title || 'Untitled Listing'}
                                        </h3>
                                    </div>
                                    <p className="text-on-surface-variant text-sm line-clamp-3 leading-relaxed">
                                        {form.description || 'No description provided.'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-xs rounded-full capitalize">
                                            {form.condition}
                                        </span>
                                        <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-xs rounded-full capitalize">
                                            {form.listingType === 'fixed' ? 'Fixed Price' : form.listingType === 'auction' ? 'Auction' : 'RFQ'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Inventory & logistics */}
                    <section className="space-y-4">
                        <h4 className="text-base font-bold uppercase tracking-widest text-primary-container">Inventory &amp; Logistics</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-card flex items-start gap-4">
                                <div className="bg-surface-container-low p-3 rounded-xl flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary-container">inventory_2</span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Stock Availability</p>
                                    <p className="font-bold text-lg">{form.globalStock} Units Ready</p>
                                    <p className="text-sm text-on-surface-variant/70">{form.dispatchLocation}</p>
                                </div>
                            </div>
                            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-card flex items-start gap-4">
                                <div className="bg-surface-container-low p-3 rounded-xl flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary-container">local_shipping</span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Shipping Profile</p>
                                    <p className="font-bold text-lg">
                                        {form.shippingProfile === 'standard_global' ? 'Standard Global' : 'Express Domestic'}
                                    </p>
                                    <p className="text-sm text-on-surface-variant/70">{form.handlingTime}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Variants */}
                    {form.variants.length > 0 && (
                        <section className="space-y-4">
                            <h4 className="text-base font-bold uppercase tracking-widest text-primary-container">Active Variants</h4>
                            <div className="flex flex-wrap gap-2">
                                {form.variants.map((v) => (
                                    <span key={v.id} className="px-3 py-1.5 bg-surface-container-low text-xs font-medium rounded-lg">
                                        {v.label || 'Unnamed variant'}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right: pricing & publish card */}
                <div className="xl:col-span-1">
                    <div className="sticky top-8">
                        <div className="bg-surface-container-lowest rounded-3xl p-7 shadow-card border border-primary-container/5 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="px-3 py-1 bg-surface-container-low text-primary-container text-[10px] font-bold uppercase tracking-widest rounded-full">
                                        {form.listingType === 'fixed' ? 'Fixed Price' : form.listingType === 'auction' ? 'Auction Mode' : 'RFQ Mode'}
                                    </span>
                                    <h4 className="font-bold text-base mt-3">Final Valuation</h4>
                                </div>
                                <span className="material-symbols-outlined text-primary-container text-3xl">verified</span>
                            </div>

                            {form.listingType === 'fixed' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-on-surface-variant text-sm">Base Price</span>
                                        <span className="font-mono text-xl font-bold">${form.basePrice || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-on-surface-variant text-sm">Seller Fee (2%)</span>
                                        <span className="font-mono text-on-surface-variant text-sm">
                                            -${sellerFee.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-baseline">
                                        <span className="font-bold text-sm">You Receive</span>
                                        <span className="font-mono text-2xl font-black text-primary-container">
                                            ${youReceive.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={onPublish}
                                    className="w-full py-4 primary-gradient text-white rounded-xl font-bold text-base shadow-card hover:shadow-card-hover active:scale-95 transition-all"
                                >
                                    Publish Listing
                                </button>
                                <button
                                    type="button"
                                    onClick={onDraft}
                                    className="w-full py-3 text-on-surface-variant font-bold hover:bg-surface-container-low rounded-xl transition-colors active:scale-95 text-sm"
                                >
                                    Save as Draft
                                </button>
                            </div>

                            <p className="text-[10px] text-center text-on-surface-variant leading-relaxed">
                                By publishing, you agree to TradeHut&apos;s{' '}
                                <a href="#" className="underline">Terms of Sale</a>{' '}
                                and confirm the authenticity of this item.
                            </p>
                        </div>

                        {/* Demand hint */}
                        <div className="mt-4 p-4 bg-bid-green/5 rounded-2xl border border-bid-green/10 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-bid-green text-white flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                            </div>
                            <div>
                                <h5 className="font-bold text-sm text-k-secondary">High Demand Detected</h5>
                                <p className="text-xs text-k-secondary/80">Similar items sell within 48 hours.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD CONTAINER
// ═══════════════════════════════════════════════════════════════════════════════

export default function CreateListing() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [form, dispatch] = useReducer(formReducer, initialState);

    const handleBack = () => {
        if (currentStep === 1) {
            navigate(-1);
        } else {
            setCurrentStep((s) => s - 1);
        }
    };

    const handleNext = () => {
        // TODO: POST /api/listings/draft/ with current step data before advancing
        setCurrentStep((s) => Math.min(s + 1, STEPS.length));
    };

    const handleDraft = () => {
        // TODO: POST /api/listings/draft/ with full form state
        console.log('[TradeHut] Save draft', form);
    };

    const handlePublish = () => {
        // TODO: POST /api/listings/publish/ with full form state
        console.log('[TradeHut] Publish listing', form);
        navigate('/listings');
    };

    const nextLabel = currentStep < STEPS.length ? `Next: ${STEPS[currentStep]?.label}` : undefined;

    return (
        <div className="min-h-screen bg-surface text-on-surface">
            {/* ── Page content ── */}
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
                            Create New Listing
                        </h1>
                        <p className="text-on-surface-variant text-sm mt-0.5">
                            Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1]?.label}
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase rounded-full self-start sm:self-auto">
                        <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                        Draft Mode
                    </span>
                </div>

                {/* Progress stepper (horizontal, visible at all widths via dots, labels at lg+) */}
                <StepperBar current={currentStep} />

                {/* Main layout: sidebar stepper (xl+) + form */}
                <div className="flex gap-10 items-start">
                    <SidebarStepper current={currentStep} />

                    {/* Form canvas */}
                    <div className="flex-1 min-w-0">
                        {currentStep === 1 && (
                            <StepCategory form={form} dispatch={dispatch} />
                        )}
                        {currentStep === 2 && (
                            <StepDetails form={form} dispatch={dispatch} />
                        )}
                        {currentStep === 3 && (
                            <StepPricing form={form} dispatch={dispatch} />
                        )}
                        {currentStep === 4 && (
                            <StepVariants form={form} dispatch={dispatch} />
                        )}
                        {currentStep === 5 && (
                            <StepInventory form={form} dispatch={dispatch} />
                        )}
                        {currentStep === 6 && (
                            <StepShipping form={form} dispatch={dispatch} />
                        )}
                        {currentStep === 7 && (
                            <StepPreview
                                form={form}
                                onPublish={handlePublish}
                                onDraft={handleDraft}
                            />
                        )}

                        {/* Footer nav — hide on step 7 (publish card handles actions) */}
                        {currentStep < 7 && (
                            <WizardFooter
                                step={currentStep}
                                totalSteps={STEPS.length}
                                onBack={handleBack}
                                onNext={handleNext}
                                onDraft={handleDraft}
                                onPublish={handlePublish}
                                nextLabel={nextLabel}
                            />
                        )}
                        {currentStep === 7 && (
                            <div className="flex items-center justify-start pt-8 mt-8 border-t border-outline-variant/15">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-outline/30 font-bold text-on-surface hover:bg-surface-container-low transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                                    Back
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
