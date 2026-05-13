"use client";

/**
 * Checkout — /checkout
 *
 * Layout: single column on mobile; two-column (65/35) at lg+.
 * Right column (Order Summary) is sticky at lg+.
 * Mobile: Order Summary collapses into a bottom drawer.
 *
 * Steps: Delivery (01) → Payment (02) → Review (03).
 *
 * TODOs:
 * - TODO: POST /api/orders/ on "Place Order" submission
 * - TODO: integrate Stripe/Paystack — client-side validation only for now
 * - TODO: replace MOCK_ADDRESSES with data from /api/account/addresses/
 * - TODO: replace MOCK_PAYMENT_METHODS with data from /api/account/payment-methods/
 * - TODO: real tax + shipping calculation from backend
 */

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { RootState } from "@/store";
import MainLayout from '@/components/Layouts/MainLayout'
import { useCurrency } from "@/contexts/CurrencyContext";
import { postFxQuote, type FxQuoteResponse } from "@/lib/fxClient";
import axiosInstance from "@/lib/axiosInstance";
import { resolveMediaSrc } from "@/lib/mediaUrl";
import { AdSlot } from "@/components/Ads";
import { PromoCodeInput } from "@/components/Promo";
import type { PromoResult } from "@/hooks/usePromo";
import {
    Check,
    ChevronDown,
    CreditCard,
    Headphones,
    Lock,
    Receipt,
    Shield,
    ShieldCheck,
    Truck,
    ArrowLeft,
} from "lucide-react";

// ─── Config (keep in sync with CartPage) ─────────────────────────────────────
const TAX_RATE = 0.15
const FREE_SHIPPING_THRESHOLD = 500
const FLAT_SHIPPING_COST = 50

// ─── Types ────────────────────────────────────────────────────────────────────
interface Address {
    id: string;
    label?: string;
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    isDefault?: boolean;
}

interface PaymentMethod {
    id: string;
    type: "card" | "paystack";
    label: string;
    last4?: string;
    expiry?: string;
    brand?: string;
}

// Derived from Redux CartItem — no separate mock shape needed
interface CheckoutItem {
    id: string | number;
    name: string;
    variant: string;
    unitPrice: number;
    quantity: number;
    imageUrl: string;
}

/** Align unit price with product detail page (variant + discount). */
function computeBuyNowUnitPrice(product: Record<string, unknown>, variant: Record<string, unknown> | null): number {
    const disc = Number(product.discount_percentage ?? 0);
    if (variant) {
        const raw =
            typeof variant.price === "string"
                ? parseFloat(variant.price)
                : Number(variant.price ?? 0);
        const pv = Number.isFinite(raw) ? raw : 0;
        return disc > 0 ? pv * (1 - disc / 100) : pv;
    }
    const baseRaw =
        typeof product.price === "string" ? parseFloat(String(product.price)) : Number(product.price ?? 0);
    const base = Number.isFinite(baseRaw) ? baseRaw : 0;
    const fpRaw = product.final_price;
    if (fpRaw != null && fpRaw !== "") {
        const fp = typeof fpRaw === "string" ? parseFloat(fpRaw) : Number(fpRaw);
        if (Number.isFinite(fp)) return fp;
    }
    return disc > 0 ? base * (1 - disc / 100) : base;
}

/** Redux guest cart rows use nested `product`; `Cart['items']` is typed as API CartItem (flat). */
interface CheckoutCartLine {
    id: string | number;
    quantity: number;
    product: {
        name?: string;
        brand?: string;
        price?: string | number;
        final_price?: number;
        main_product_image?: string;
        image?: string;
    };
}

// ─── Mock data — TODO: replace addresses + payment methods with API ───────────
const MOCK_ADDRESSES: Address[] = [
    {
        id: "addr-1",
        label: "Default",
        name: "Marcus Aurelius",
        street: "4482 Palatine Hill Rd, Suite 102",
        city: "Imperial District",
        state: "Rome",
        zip: "RM 00186",
        country: "IT",
        isDefault: true,
    },
    {
        id: "addr-2",
        name: "Commodus Lucius",
        street: "120 Gladiator Street, Floor 5",
        city: "Arena Heights",
        state: "Naples",
        zip: "NA 80121",
        country: "IT",
    },
];

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
    {
        id: "pm-1",
        type: "card",
        label: "Visa ending in 4242",
        last4: "4242",
        expiry: "09/27",
        brand: "Visa",
    },
    {
        id: "pm-2",
        type: "card",
        label: "Mastercard ending in 5555",
        last4: "5555",
        expiry: "12/26",
        brand: "Mastercard",
    },
];

const DELIVERY_OPTIONS = [
    {
        id: "express",
        label: "Express Courier",
        sublabel: "Estimated delivery: 2–3 business days",
        cost: 24.0,
    },
    {
        id: "standard",
        label: "Standard Logistics",
        sublabel: "Estimated delivery: 5–7 business days",
        cost: 0,
    },
];

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: "Delivery" },
    { id: 2, label: "Payment" },
    { id: 3, label: "Review" },
];

// ─── Step Progress Indicator ──────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
    return (
        <nav aria-label="Checkout progress" className="mb-10 md:mb-14">
            <ol className="flex items-center" role="list">
                {STEPS.map((step, idx) => {
                    const isActive = step.id === current;
                    const isDone = step.id < current;
                    const isLast = idx === STEPS.length - 1;
                    return (
                        <li key={step.id} className={`relative flex items-center ${!isLast ? "flex-1" : ""}`}>
                            <div className="flex items-center">
                                <div
                                    className={[
                                        "relative flex h-10 w-10 min-w-[2.5rem] items-center justify-center rounded-full text-sm font-bold transition-all",
                                        isActive
                                            ? "bg-zinc-900 text-white"
                                            : isDone
                                            ? "bg-zinc-900 text-white"
                                            : "bg-zinc-100 text-zinc-400",
                                    ].join(" ")}
                                    aria-current={isActive ? "step" : undefined}
                                >
                                    {isDone ? (
                                        <Check size={15} strokeWidth={3} />
                                    ) : (
                                        <span className="font-mono text-xs">{String(step.id).padStart(2, "0")}</span>
                                    )}
                                </div>
                                <span
                                    className={[
                                        "ml-3 text-sm hidden sm:block",
                                        isActive ? "font-bold text-zinc-900" : "font-medium text-zinc-400",
                                    ].join(" ")}
                                >
                                    {step.label}
                                </span>
                            </div>
                            {!isLast && (
                                <div
                                    className={[
                                        "flex-1 mx-3 h-0.5 rounded-full transition-all",
                                        isDone ? "bg-zinc-900" : "bg-zinc-200",
                                    ].join(" ")}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

// ─── Step 1: Delivery ─────────────────────────────────────────────────────────
function StepDelivery({
    selectedAddressId,
    onSelectAddress,
    selectedDelivery,
    onSelectDelivery,
    onContinue,
    formatCurrency,
}: {
    selectedAddressId: string;
    onSelectAddress: (id: string) => void;
    selectedDelivery: string;
    onSelectDelivery: (id: string) => void;
    onContinue: () => void;
    formatCurrency: (n: number) => string;
}) {
    return (
        <div className="space-y-10 md:space-y-12">
            {/* Delivery Address */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 uppercase">
                        Delivery Address
                    </h2>
                    <button className="text-sm font-bold text-zinc-900 hover:underline underline-offset-4 transition-colors">
                        + Add New
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    {MOCK_ADDRESSES.map((addr) => {
                        const isSelected = addr.id === selectedAddressId;
                        return (
                            <button
                                key={addr.id}
                                onClick={() => onSelectAddress(addr.id)}
                                className={[
                                    "relative p-5 rounded-xl text-left transition-all duration-200 w-full border-2",
                                    isSelected
                                        ? "bg-white border-zinc-900 shadow-sm"
                                        : "bg-zinc-50 border-transparent hover:border-zinc-200",
                                ].join(" ")}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    {addr.label ? (
                                        <span className="px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded">
                                            {addr.label}
                                        </span>
                                    ) : (
                                        <span className="opacity-0 text-[10px]">—</span>
                                    )}
                                    {/* Radio indicator */}
                                    <div
                                        className={[
                                            "h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                                            isSelected ? "border-zinc-900 bg-zinc-900" : "border-zinc-300 bg-transparent",
                                        ].join(" ")}
                                    >
                                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                </div>
                                <p className="font-bold text-zinc-900 mb-1 text-sm">{addr.name}</p>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    {addr.street}<br />
                                    {addr.city}, {addr.state} {addr.zip}<br />
                                    {addr.country}
                                </p>
                                <div className="mt-3 pt-3 border-t border-zinc-100">
                                    <span className="text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors">Edit</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Delivery Method */}
            <section className="space-y-5">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 uppercase">
                    Delivery Method
                </h2>
                <div className="space-y-3">
                    {DELIVERY_OPTIONS.map((opt) => {
                        const isSelected = opt.id === selectedDelivery;
                        return (
                            <label
                                key={opt.id}
                                className={[
                                    "flex items-center p-5 rounded-xl cursor-pointer border-2 transition-all duration-200",
                                    isSelected
                                        ? "bg-white border-zinc-900 shadow-sm"
                                        : "bg-zinc-50 border-transparent hover:border-zinc-200",
                                ].join(" ")}
                            >
                                <input
                                    type="radio"
                                    name="delivery"
                                    value={opt.id}
                                    checked={isSelected}
                                    onChange={() => onSelectDelivery(opt.id)}
                                    className="h-4 w-4 accent-zinc-900"
                                />
                                <div className="ml-4 flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold text-zinc-900 text-sm">{opt.label}</p>
                                        <p className="font-mono font-bold text-sm text-zinc-900">
                                            {opt.cost === 0 ? (
                                                <span className="text-emerald-600">Free</span>
                                            ) : (
                                                `+${formatCurrency(opt.cost)}`
                                            )}
                                        </p>
                                    </div>
                                    <p className="text-sm text-zinc-500 mt-0.5">{opt.sublabel}</p>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </section>

            {/* CTA */}
            <div className="pt-2">
                <button
                    onClick={onContinue}
                    className="w-full md:w-auto px-10 py-4 bg-zinc-900 text-white font-bold rounded-xl shadow-lg hover:bg-zinc-700 active:scale-95 transition-all min-h-[52px] uppercase tracking-widest text-sm"
                >
                    Continue to Payment
                </button>
                <p className="mt-4 text-xs text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-zinc-400" />
                    Your data is encrypted and secure
                </p>
            </div>
        </div>
    );
}

// ─── Step 2: Payment ──────────────────────────────────────────────────────────
function StepPayment({
    selectedPaymentId,
    onSelectPayment,
    onContinue,
    onBack,
}: {
    selectedPaymentId: string;
    onSelectPayment: (id: string) => void;
    onContinue: () => void;
    onBack: () => void;
}) {
    const [addingNew, setAddingNew] = useState(false);

    return (
        <div className="space-y-10 md:space-y-12">
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 uppercase">
                        Payment Method
                    </h2>
                    <button
                        onClick={() => setAddingNew((v) => !v)}
                        className="text-sm font-bold text-zinc-900 hover:underline underline-offset-4 transition-colors"
                    >
                        + Add New Card
                    </button>
                </div>

                <div className="space-y-3">
                    {MOCK_PAYMENT_METHODS.map((pm) => {
                        const isSelected = pm.id === selectedPaymentId;
                        return (
                            <label
                                key={pm.id}
                                className={[
                                    "flex items-center p-5 rounded-xl cursor-pointer border-2 transition-all duration-200",
                                    isSelected
                                        ? "bg-white border-zinc-900 shadow-sm"
                                        : "bg-zinc-50 border-transparent hover:border-zinc-200",
                                ].join(" ")}
                            >
                                <input
                                    type="radio"
                                    name="payment"
                                    value={pm.id}
                                    checked={isSelected}
                                    onChange={() => onSelectPayment(pm.id)}
                                    className="h-4 w-4 accent-zinc-900"
                                />
                                <div className="ml-4 flex-1 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-zinc-900 text-sm">{pm.label}</p>
                                        {pm.expiry && (
                                            <p className="text-xs text-zinc-500 mt-0.5">Expires {pm.expiry}</p>
                                        )}
                                    </div>
                                    <CreditCard size={18} className="text-zinc-400 flex-shrink-0" />
                                </div>
                            </label>
                        );
                    })}
                </div>

                {/* New card form */}
                {addingNew && (
                    <div className="bg-white rounded-xl border-2 border-zinc-200 p-5 space-y-4">
                        <h3 className="font-bold text-zinc-900 text-sm">New Card Details</h3>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                                Card Number
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={19}
                                placeholder="0000 0000 0000 0000"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-3 px-4 text-sm font-mono focus:border-zinc-900 outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                                    Expiry
                                </label>
                                <input
                                    type="text"
                                    placeholder="MM / YY"
                                    maxLength={7}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-3 px-4 text-sm font-mono focus:border-zinc-900 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                                    CVC
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="•••"
                                    maxLength={4}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-3 px-4 text-sm font-mono focus:border-zinc-900 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                                Name on Card
                            </label>
                            <input
                                type="text"
                                placeholder="Full name as it appears on card"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-3 px-4 text-sm focus:border-zinc-900 outline-none transition-all"
                            />
                        </div>
                        {/* TODO: integrate Stripe/Paystack */}
                        <p className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                            <Shield size={12} className="text-zinc-400" />
                            Card details are encrypted. We never store your full card number.
                        </p>
                    </div>
                )}
            </section>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                    onClick={onBack}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all min-h-[52px] text-sm flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={15} /> Back
                </button>
                <button
                    onClick={onContinue}
                    className="w-full sm:w-auto px-10 py-4 bg-zinc-900 text-white font-bold rounded-xl shadow-lg hover:bg-zinc-700 active:scale-95 transition-all min-h-[52px] uppercase tracking-widest text-sm"
                >
                    Continue to Review
                </button>
            </div>
        </div>
    );
}

// ─── Step 3: Review ───────────────────────────────────────────────────────────
function StepReview({
    items,
    address,
    deliveryOption,
    paymentMethod,
    subtotal,
    deliveryCost,
    tax,
    total,
    appliedPromo,
    onPromoChange,
    onBack,
    onPlaceOrder,
    formatDisplayPrice,
    formatCurrency,
    checkoutQuote,
}: {
    items: CheckoutItem[];
    address: Address | undefined;
    deliveryOption: (typeof DELIVERY_OPTIONS)[0] | undefined;
    paymentMethod: PaymentMethod | undefined;
    subtotal: number;
    deliveryCost: number;
    tax: number;
    total: number;
    appliedPromo: PromoResult | null;
    onPromoChange: (r: PromoResult | null) => void;
    onBack: () => void;
    onPlaceOrder: () => void;
    /** Base → selected currency (client table / fallback). */
    formatDisplayPrice: (n: number) => string;
    /** Value already in selected currency (server quote). */
    formatCurrency: (n: number) => string;
    checkoutQuote: FxQuoteResponse | null;
}) {
    return (
        <div className="space-y-10 md:space-y-12">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 uppercase">
                Review Order
            </h2>

            {/* Delivery + Payment summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            Delivery To
                        </span>
                        <button
                            onClick={onBack}
                            className="text-xs font-bold text-zinc-900 hover:underline underline-offset-2 transition-all"
                        >
                            Change
                        </button>
                    </div>
                    {address ? (
                        <>
                            <p className="font-bold text-zinc-900 text-sm">{address.name}</p>
                            <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                                {address.street}<br />
                                {address.city}, {address.state} {address.zip}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-zinc-500">No address selected.</p>
                    )}
                </div>

                <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            Payment
                        </span>
                        <button
                            onClick={onBack}
                            className="text-xs font-bold text-zinc-900 hover:underline underline-offset-2 transition-all"
                        >
                            Change
                        </button>
                    </div>
                    {paymentMethod ? (
                        <div className="flex items-center gap-3">
                            <CreditCard size={18} className="text-zinc-400 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-zinc-900 text-sm">{paymentMethod.label}</p>
                                {paymentMethod.expiry && (
                                    <p className="text-xs text-zinc-500 mt-0.5">Exp {paymentMethod.expiry}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500">No payment method selected.</p>
                    )}
                </div>
            </div>

            {/* Items */}
            <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Items ({items.length})
                </h3>
                <div className="space-y-3">
                    {items.map((item, idx) => {
                        const lineTotal = checkoutQuote?.line_items?.[idx]?.line_total
                        const lineLabel =
                            lineTotal != null && Number.isFinite(lineTotal)
                                ? formatCurrency(lineTotal)
                                : formatDisplayPrice(item.unitPrice * item.quantity)
                        return (
                        <div
                            key={item.id}
                            className="flex gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                                <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    sizes="(max-width: 768px) 64px, 80px"
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 leading-tight line-clamp-2">
                                    {item.name}
                                </p>
                                <p className="text-xs text-zinc-500 mt-0.5">{item.variant}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-xs text-zinc-400 font-mono">
                                        {formatDisplayPrice(item.unitPrice)} × {item.quantity}
                                    </p>
                                    <p className="font-mono text-sm font-black text-zinc-900">
                                        {lineLabel}
                                    </p>
                                </div>
                            </div>
                        </div>
                        )
                    })}
                </div>
            </section>

            {/* Promo code */}
            <div>
                <PromoCodeInput
                    cart={{
                        subtotal,
                        item_count: items.length,
                        item_ids: items.map((i) => String(i.id)),
                    }}
                    initial={appliedPromo}
                    onChange={onPromoChange}
                />
            </div>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                    onClick={onBack}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all min-h-[52px] text-sm flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={15} /> Back
                </button>
                <button
                    onClick={onPlaceOrder}
                    className="w-full sm:flex-1 px-10 py-4 bg-zinc-900 text-white font-bold rounded-xl shadow-lg hover:bg-zinc-700 active:scale-95 transition-all min-h-[52px] uppercase tracking-widest text-sm"
                >
                    Place Order
                </button>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 -mt-6">
                <Shield size={13} className="text-zinc-400" />
                256-bit SSL encryption. Your payment details are never stored.
            </p>
        </div>
    );
}

// ─── Order Summary panel ──────────────────────────────────────────────────────
function OrderSummary({
    items,
    subtotal,
    deliveryCost,
    deliveryLabel,
    tax,
    total,
    formatDisplayPrice,
    formatCurrency,
    checkoutQuote,
    quoteApplies,
    quoteLoading,
    ratesHint,
    snapshotMismatch,
}: {
    items: CheckoutItem[];
    subtotal: number;
    deliveryCost: number;
    deliveryLabel: string;
    tax: number;
    total: number;
    formatDisplayPrice: (n: number) => string;
    formatCurrency: (n: number) => string;
    checkoutQuote: FxQuoteResponse | null;
    quoteApplies: boolean;
    quoteLoading: boolean;
    ratesHint: string | null;
    snapshotMismatch: boolean;
}) {
    const shipFree = quoteApplies
        ? (checkoutQuote?.amounts.shipping ?? 0) === 0
        : deliveryCost === 0

    return (
        <div
            className={`bg-zinc-50 rounded-3xl p-6 md:p-8 border border-zinc-100 space-y-6 md:space-y-8 transition-opacity ${quoteLoading ? "opacity-70" : ""}`}
        >
            <div>
                <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Order Summary</h3>
                {ratesHint ? (
                    <p className="text-[10px] text-zinc-400 mt-1 font-medium">{ratesHint}</p>
                ) : null}
                {snapshotMismatch ? (
                    <p className="text-[10px] text-amber-700 mt-1 font-bold">
                        Rates refreshed — totals updated to the latest snapshot.
                    </p>
                ) : null}
            </div>

            {/* Items */}
            <div className="space-y-4">
                {items.map((item, idx) => {
                    const lineTotal = checkoutQuote?.line_items?.[idx]?.line_total
                    const lineLabel =
                        quoteApplies && lineTotal != null && Number.isFinite(lineTotal)
                            ? formatCurrency(lineTotal)
                            : formatDisplayPrice(item.unitPrice * item.quantity)
                    return (
                    <div key={item.id} className="flex gap-3 md:gap-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                            <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                sizes="(max-width: 768px) 64px, 80px"
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 leading-tight line-clamp-2">{item.name}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">{item.variant}</p>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-zinc-400 font-mono">
                                    {formatDisplayPrice(item.unitPrice)} × {item.quantity}
                                </p>
                                <p className="font-mono text-sm font-black text-zinc-900">
                                    {lineLabel}
                                </p>
                            </div>
                        </div>
                    </div>
                    )
                })}
            </div>

            <div className="h-px bg-zinc-200" />

            {/* Pricing breakdown */}
            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-xs font-bold tracking-wide">Subtotal</span>
                    <span className="font-mono text-zinc-900 font-bold">
                        {quoteApplies && checkoutQuote
                            ? formatCurrency(checkoutQuote.amounts.subtotal)
                            : formatDisplayPrice(subtotal)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-xs font-bold tracking-wide">
                        Delivery ({deliveryLabel})
                    </span>
                    <span className="font-mono text-zinc-900 font-bold">
                        {shipFree ? (
                            <span className="text-emerald-600 font-bold">Free</span>
                        ) : quoteApplies && checkoutQuote ? (
                            formatCurrency(checkoutQuote.amounts.shipping)
                        ) : (
                            formatDisplayPrice(deliveryCost)
                        )}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-xs font-bold tracking-wide">
                        Tax ({(TAX_RATE * 100).toFixed(0)}%)
                    </span>
                    <span className="font-mono text-zinc-900 font-bold">
                        {quoteApplies && checkoutQuote
                            ? formatCurrency(checkoutQuote.amounts.tax)
                            : formatDisplayPrice(tax)}
                    </span>
                </div>
            </div>

            {/* Total */}
            <div className="pt-5 border-t border-zinc-200 flex justify-between items-end">
                <span className="text-zinc-900 font-black uppercase text-lg">Total</span>
                <span className="font-mono font-black text-2xl text-zinc-900 tracking-tighter">
                    {quoteApplies && checkoutQuote
                        ? formatCurrency(checkoutQuote.amounts.total)
                        : formatDisplayPrice(total)}
                </span>
            </div>

            {/* Help block */}
            <div className="p-4 rounded-2xl bg-white border border-zinc-100 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Headphones size={16} className="text-zinc-700" />
                </div>
                <div>
                    <p className="text-xs font-bold text-zinc-900">Need help with your order?</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Speak with a specialist: 1-800-TRADEHUT</p>
                </div>
            </div>

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-5 text-[10px] text-zinc-400 uppercase tracking-widest">
                <span className="flex items-center gap-1"><ShieldCheck size={12} /> Secure</span>
                <span className="flex items-center gap-1">
                    <Truck size={12} />
                    Free over {formatDisplayPrice(FREE_SHIPPING_THRESHOLD)}
                </span>
            </div>
        </div>
    );
}

// ─── Mobile Summary Drawer ────────────────────────────────────────────────────
function MobileSummaryDrawer({
    totalBase,
    formatDisplayPrice,
    formattedStickyTotal,
    children,
}: {
    totalBase: number;
    formatDisplayPrice: (n: number) => string;
    /** Pre-formatted total in selected currency when server quote applies. */
    formattedStickyTotal: string | null;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="lg:hidden">
            {/* Sticky trigger bar */}
            <div className="sticky bottom-0 inset-x-0 z-40 bg-white border-t border-zinc-100 shadow-lg px-4 py-3">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="w-full flex items-center justify-between py-2 min-h-[44px]"
                    aria-expanded={open}
                >
                    <span className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                        <Receipt size={15} className="text-zinc-500" />
                        Order Summary
                    </span>
                    <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-zinc-900">
                            {formattedStickyTotal ?? formatDisplayPrice(totalBase)}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        />
                    </div>
                </button>
            </div>

            {/* Bottom sheet */}
            {open && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    <div className="relative z-10 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto">
                        {/* Drag handle */}
                        <div className="sticky top-0 bg-white rounded-t-3xl px-6 pt-4 pb-2 flex justify-center">
                            <div className="w-10 h-1 rounded-full bg-zinc-200" />
                        </div>
                        <div className="px-4 pb-10">{children}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function CheckoutPageInner() {
    const searchParams = useSearchParams()
    const { cart } = useSelector((state: RootState) => state.cart)
    const {
        formatDisplayPrice,
        formatCurrency,
        currency,
        baseCurrency,
        fxSnapshotId,
        fxAsOf,
        fxStale,
    } = useCurrency()

    const [checkoutQuote, setCheckoutQuote] = useState<FxQuoteResponse | null>(null)
    const [quoteLoading, setQuoteLoading] = useState(false)

    const [step, setStep] = useState(1);
    const [selectedAddressId, setSelectedAddressId] = useState(
        MOCK_ADDRESSES.find((a) => a.isDefault)?.id ?? MOCK_ADDRESSES[0]?.id ?? ""
    );
    const [selectedDelivery, setSelectedDelivery] = useState(DELIVERY_OPTIONS[1].id); // default standard (free)
    const [selectedPaymentId, setSelectedPaymentId] = useState(
        MOCK_PAYMENT_METHODS[0]?.id ?? ""
    );
    const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null);

    const buyNowFlag =
        searchParams.get("buyNow") === "1" || searchParams.get("buyNow") === "true";
    const buyNowProductId = searchParams.get("product");
    const buyNowVariantId = searchParams.get("variant");
    const buyNowQtyParam = searchParams.get("qty");
    const isBuyNowCheckout = Boolean(buyNowFlag && buyNowProductId);

    const [buyNowItems, setBuyNowItems] = useState<CheckoutItem[]>([]);
    const [buyNowLoadState, setBuyNowLoadState] = useState<
        "idle" | "loading" | "error" | "done"
    >("idle");
    const [buyNowErrorMsg, setBuyNowErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!isBuyNowCheckout || !buyNowProductId) {
            setBuyNowItems([]);
            setBuyNowLoadState("idle");
            setBuyNowErrorMsg(null);
            return;
        }

        let cancelled = false;
        setBuyNowLoadState("loading");
        setBuyNowErrorMsg(null);

        const qtyRaw = parseInt(buyNowQtyParam || "1", 10);
        const quantity = Math.max(1, Math.min(999, Number.isFinite(qtyRaw) ? qtyRaw : 1));

        (async () => {
            try {
                const [productRes, variantsRes] = await Promise.all([
                    axiosInstance.get(`/products/${buyNowProductId}/`),
                    axiosInstance.get(`/products/${buyNowProductId}/variants/`),
                ]);
                const product = productRes.data as Record<string, unknown>;
                const variants = Array.isArray(variantsRes.data) ? variantsRes.data : [];
                let variant: Record<string, unknown> | null = buyNowVariantId
                    ? (variants.find(
                          (v: { id?: string | number }) =>
                              String(v.id) === String(buyNowVariantId)
                      ) as Record<string, unknown> | undefined) ?? null
                    : null;

                if (variants.length > 0 && !variant) {
                    if (!cancelled) {
                        setBuyNowLoadState("error");
                        setBuyNowErrorMsg(
                            "This product requires a variant. Open the product page and choose options."
                        );
                        setBuyNowItems([]);
                    }
                    return;
                }

                const unitPrice = computeBuyNowUnitPrice(product, variant);
                const mainImg = product.main_product_image;
                let imageUrl =
                    (typeof mainImg === "string" ? mainImg : null) ||
                    (typeof product.image === "string" ? product.image : null) ||
                    "/placeholder.png";
                if (imageUrl !== "/placeholder.png") {
                    imageUrl = resolveMediaSrc(imageUrl) || imageUrl;
                }
                const name = (typeof product.name === "string" ? product.name : null) ?? "Product";
                const variantLabel =
                    (variant &&
                        (typeof variant.name === "string"
                            ? variant.name
                            : typeof variant.sku === "string"
                              ? variant.sku
                              : null)) ||
                    (typeof product.brand === "string" ? product.brand : null) ||
                    "Standard";

                const line: CheckoutItem = {
                    id: `buy-now-${buyNowProductId}-${buyNowVariantId || "default"}`,
                    name,
                    variant: variantLabel,
                    unitPrice,
                    quantity,
                    imageUrl,
                };

                if (!cancelled) {
                    setBuyNowItems([line]);
                    setBuyNowLoadState("done");
                }
            } catch {
                if (!cancelled) {
                    setBuyNowLoadState("error");
                    setBuyNowErrorMsg("Could not load this product for checkout.");
                    setBuyNowItems([]);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isBuyNowCheckout, buyNowProductId, buyNowVariantId, buyNowQtyParam]);

    // ── Line items: buy-now (single SKU from URL) vs full cart ─────────────────
    const items: CheckoutItem[] = useMemo(() => {
        if (isBuyNowCheckout) {
            if (buyNowLoadState === "done" && buyNowItems.length > 0) return buyNowItems;
            return [];
        }
        const rows = cart.items as unknown as CheckoutCartLine[];
        return rows.map((item) => {
            const unitPrice = Number(item.product?.final_price ?? item.product?.price ?? 0) || 0;
            const rawImg =
                item.product?.main_product_image || item.product?.image || "/placeholder.png";
            const imageUrl =
                rawImg === "/placeholder.png"
                    ? rawImg
                    : resolveMediaSrc(rawImg) || "/placeholder.png";
            return {
                id: item.id,
                name: item.product?.name ?? "Unknown Product",
                variant: item.product?.brand ?? "Tradehut",
                unitPrice,
                quantity: Number(item.quantity) || 1,
                imageUrl,
            };
        });
    }, [isBuyNowCheckout, buyNowLoadState, buyNowItems, cart.items]);

    const lineItemsPayload = useMemo(
        () => items.map((i) => ({ unit_price: i.unitPrice, quantity: i.quantity })),
        [items]
    )

    // ── Totals — mirrors CartPage logic exactly ───────────────────────────────
    const subtotal = useMemo(
        () => items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
        [items]
    )

    const deliveryOption = DELIVERY_OPTIONS.find((d) => d.id === selectedDelivery) ?? DELIVERY_OPTIONS[1]

    // Promo discount + free-shipping override
    const promoDiscount = appliedPromo?.valid ? parseFloat(appliedPromo.discount_amount || '0') : 0
    const subtotalAfterPromo = Math.max(0, subtotal - promoDiscount)
    const promoFreeShipping = !!appliedPromo?.free_shipping

    // Override free-shipping threshold from cart config; delivery option cost only applies when below threshold
    const deliveryCost =
        promoFreeShipping || subtotalAfterPromo > FREE_SHIPPING_THRESHOLD ? 0 : deliveryOption.cost

    const tax = subtotalAfterPromo * TAX_RATE
    const total = subtotalAfterPromo + deliveryCost + tax

    useEffect(() => {
        if (!items.length) {
            setCheckoutQuote(null)
            setQuoteLoading(false)
            return
        }
        let cancelled = false
        setQuoteLoading(true)
        postFxQuote({
            target_currency: currency,
            snapshot_id: fxSnapshotId ?? undefined,
            subtotal,
            shipping: deliveryCost,
            tax,
            line_items: lineItemsPayload,
        }).then((res) => {
            if (cancelled) return
            setCheckoutQuote(res)
            setQuoteLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [currency, fxSnapshotId, subtotal, deliveryCost, tax, lineItemsPayload, items.length])

    const quoteApplies = Boolean(
        checkoutQuote?.amounts &&
            checkoutQuote.target_currency === currency &&
            checkoutQuote.base_currency === baseCurrency
    )

    const ratesHint =
        quoteApplies && fxAsOf ? `Rates as of ${fxAsOf}${fxStale ? " (stale)" : ""}` : null

    const snapshotMismatch = Boolean(checkoutQuote?.snapshot_mismatch)

    const address = MOCK_ADDRESSES.find((a) => a.id === selectedAddressId);
    const paymentMethod = MOCK_PAYMENT_METHODS.find((p) => p.id === selectedPaymentId);

    function handlePlaceOrder() {
        // TODO: POST /api/orders/ with cart items + address + payment + appliedPromo?.code
        // TODO: integrate Stripe/Paystack
        alert("Order placed! (Integration pending)");
    }

    const stickyTotalFormatted =
        quoteApplies && checkoutQuote ? formatCurrency(checkoutQuote.amounts.total) : null

    const backHref =
        isBuyNowCheckout && buyNowProductId ? `/products/${buyNowProductId}` : "/cart";
    const backLabel = isBuyNowCheckout ? "Back to product" : "Return to cart";

    const buyNowResolving =
        isBuyNowCheckout &&
        (buyNowLoadState === "idle" || buyNowLoadState === "loading");

    if (!isBuyNowCheckout && (!cart.items || cart.items.length === 0)) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-zinc-900">
                    <p className="text-lg font-bold mb-2">Your cart is empty</p>
                    <p className="text-sm text-zinc-500 mb-6 text-center max-w-sm">
                        Add something to your cart, or buy a single item from a product page.
                    </p>
                    <Link
                        href="/products"
                        className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Browse products
                    </Link>
                </div>
            </MainLayout>
        );
    }

    if (buyNowResolving) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-white flex items-center justify-center">
                    <div className="text-center space-y-3">
                        <div className="mx-auto h-10 w-10 rounded-full border-2 border-zinc-200 border-t-emerald-600 animate-spin" />
                        <p className="text-sm text-zinc-500">Preparing your order…</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (isBuyNowCheckout && buyNowLoadState === "error") {
        return (
            <MainLayout>
                <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-zinc-900 gap-4">
                    <p className="text-center text-zinc-700 max-w-md">
                        {buyNowErrorMsg ?? "Something went wrong."}
                    </p>
                    <Link
                        href={backHref}
                        className="text-sm font-bold text-emerald-600 hover:underline flex items-center gap-1.5"
                    >
                        <ArrowLeft size={14} /> {backLabel}
                    </Link>
                </div>
            </MainLayout>
        );
    }

    if (isBuyNowCheckout && buyNowLoadState === "done" && items.length === 0) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-zinc-900 gap-4">
                    <p className="text-center text-zinc-700">Could not build checkout for this product.</p>
                    <Link
                        href={backHref}
                        className="text-sm font-bold text-emerald-600 hover:underline flex items-center gap-1.5"
                    >
                        <ArrowLeft size={14} /> {backLabel}
                    </Link>
                </div>
            </MainLayout>
        );
    }

    const summaryNode = (
        <OrderSummary
            items={items}
            subtotal={subtotal}
            deliveryCost={deliveryCost}
            deliveryLabel={deliveryOption.label}
            tax={tax}
            total={total}
            formatDisplayPrice={formatDisplayPrice}
            formatCurrency={formatCurrency}
            checkoutQuote={checkoutQuote}
            quoteApplies={quoteApplies}
            quoteLoading={quoteLoading}
            ratesHint={ratesHint}
            snapshotMismatch={snapshotMismatch}
        />
    );

    return (
      <MainLayout>
        <div className="min-h-screen bg-white text-zinc-900">
            {/* Header */}
            <header className="sticky top-0 w-full z-50 bg-white/90 backdrop-blur border-b border-zinc-100">
                <div className="max-w-screen-xl mx-auto flex items-center justify-between px-4 md:px-8 py-4">
                    <div className="flex items-center gap-4 md:gap-6">
                        <Link href="/" className="text-xl md:text-2xl font-black tracking-tighter text-zinc-900 hover:text-zinc-600 transition-colors">
                            TradeHut
                        </Link>
                        <div className="hidden sm:flex items-center gap-1.5 text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full">
                            <Lock size={11} strokeWidth={2.5} />
                            <span className="text-xs font-bold uppercase tracking-widest">Secure Checkout</span>
                        </div>
                    </div>
                    <Link
                        href={backHref}
                        className="text-sm font-medium text-zinc-400 hover:text-zinc-900 transition-colors min-h-[44px] flex items-center gap-1.5"
                    >
                        <ArrowLeft size={14} /> {backLabel}
                    </Link>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-12 pb-32 lg:pb-12">
                {/* Checkout banner — admin-managed (e.g. payment partner promo) */}
                <div className="mb-6">
                    <AdSlot slug="checkout-banner" aspectClass="aspect-[21/3]" rounded="rounded-xl" />
                </div>
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                    {/* Left: stepper + step forms */}
                    <div className="lg:w-[65%]">
                        <StepIndicator current={step} />

                        {step === 1 && (
                            <StepDelivery
                                selectedAddressId={selectedAddressId}
                                onSelectAddress={setSelectedAddressId}
                                selectedDelivery={selectedDelivery}
                                onSelectDelivery={setSelectedDelivery}
                                onContinue={() => setStep(2)}
                                formatCurrency={formatDisplayPrice}
                            />
                        )}
                        {step === 2 && (
                            <StepPayment
                                selectedPaymentId={selectedPaymentId}
                                onSelectPayment={setSelectedPaymentId}
                                onContinue={() => setStep(3)}
                                onBack={() => setStep(1)}
                            />
                        )}
                        {step === 3 && (
                            <StepReview
                                items={items}
                                address={address}
                                deliveryOption={deliveryOption}
                                paymentMethod={paymentMethod}
                                subtotal={subtotal}
                                deliveryCost={deliveryCost}
                                tax={tax}
                                total={total}
                                appliedPromo={appliedPromo}
                                onPromoChange={setAppliedPromo}
                                onBack={() => setStep(2)}
                                onPlaceOrder={handlePlaceOrder}
                                formatDisplayPrice={formatDisplayPrice}
                                formatCurrency={formatCurrency}
                                checkoutQuote={quoteApplies ? checkoutQuote : null}
                            />
                        )}
                    </div>

                    {/* Right: sticky summary — desktop only */}
                    <div className="hidden lg:block lg:w-[35%]">
                        <div className="sticky top-24">{summaryNode}</div>
                    </div>
                </div>
            </main>

            {/* Mobile: bottom drawer */}
            <MobileSummaryDrawer
                totalBase={total}
                formatDisplayPrice={formatDisplayPrice}
                formattedStickyTotal={stickyTotalFormatted}
            >
                {summaryNode}
            </MobileSummaryDrawer>
        </div>
        </MainLayout>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense
            fallback={
                <MainLayout>
                    <div className="min-h-screen bg-white flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full border-2 border-zinc-200 border-t-emerald-600 animate-spin" />
                    </div>
                </MainLayout>
            }
        >
            <CheckoutPageInner />
        </Suspense>
    );
}