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

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import MainLayout from '@/components/Layouts/MainLayout'
import { useCurrency } from "@/contexts/CurrencyContext";
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
    promoCode,
    onPromoChange,
    onApplyPromo,
    onBack,
    onPlaceOrder,
    formatCurrency,
}: {
    items: CheckoutItem[];
    address: Address | undefined;
    deliveryOption: (typeof DELIVERY_OPTIONS)[0] | undefined;
    paymentMethod: PaymentMethod | undefined;
    subtotal: number;
    deliveryCost: number;
    tax: number;
    total: number;
    promoCode: string;
    onPromoChange: (v: string) => void;
    onApplyPromo: () => void;
    onBack: () => void;
    onPlaceOrder: () => void;
    formatCurrency: (n: number) => string;
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
                    {items.map((item) => (
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
                                        {formatCurrency(item.unitPrice)} × {item.quantity}
                                    </p>
                                    <p className="font-mono text-sm font-black text-zinc-900">
                                        {formatCurrency(item.unitPrice * item.quantity)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Promo code */}
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                    Promo Code
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => onPromoChange(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg py-3 px-4 text-xs font-bold text-zinc-900 focus:border-zinc-900 outline-none transition-all uppercase"
                    />
                    <button
                        onClick={onApplyPromo}
                        disabled={!promoCode.trim()}
                        className="px-5 py-3 bg-zinc-200 text-zinc-900 text-xs font-bold rounded-lg hover:bg-zinc-300 transition-colors disabled:opacity-40 uppercase"
                    >
                        Apply
                    </button>
                </div>
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
    formatCurrency,
}: {
    items: CheckoutItem[];
    subtotal: number;
    deliveryCost: number;
    deliveryLabel: string;
    tax: number;
    total: number;
    formatCurrency: (n: number) => string;
}) {
    return (
        <div className="bg-zinc-50 rounded-3xl p-6 md:p-8 border border-zinc-100 space-y-6 md:space-y-8">
            <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Order Summary</h3>

            {/* Items */}
            <div className="space-y-4">
                {items.map((item) => (
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
                                    {formatCurrency(item.unitPrice)} × {item.quantity}
                                </p>
                                <p className="font-mono text-sm font-black text-zinc-900">
                                    {formatCurrency(item.unitPrice * item.quantity)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="h-px bg-zinc-200" />

            {/* Pricing breakdown */}
            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-xs font-bold tracking-wide">Subtotal</span>
                    <span className="font-mono text-zinc-900 font-bold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-xs font-bold tracking-wide">
                        Delivery ({deliveryLabel})
                    </span>
                    <span className="font-mono text-zinc-900 font-bold">
                        {deliveryCost === 0 ? (
                            <span className="text-emerald-600 font-bold">Free</span>
                        ) : (
                            formatCurrency(deliveryCost)
                        )}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-xs font-bold tracking-wide">
                        Tax ({(TAX_RATE * 100).toFixed(0)}%)
                    </span>
                    <span className="font-mono text-zinc-900 font-bold">{formatCurrency(tax)}</span>
                </div>
            </div>

            {/* Total */}
            <div className="pt-5 border-t border-zinc-200 flex justify-between items-end">
                <span className="text-zinc-900 font-black uppercase text-lg">Total</span>
                <span className="font-mono font-black text-2xl text-zinc-900 tracking-tighter">
                    {formatCurrency(total)}
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
                    Free over {formatCurrency(FREE_SHIPPING_THRESHOLD)}
                </span>
            </div>
        </div>
    );
}

// ─── Mobile Summary Drawer ────────────────────────────────────────────────────
function MobileSummaryDrawer({
    total,
    formatCurrency,
    children,
}: {
    total: number;
    formatCurrency: (n: number) => string;
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
                        <span className="font-mono font-black text-zinc-900">{formatCurrency(total)}</span>
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
export default function CheckoutPage() {
    const { cart } = useSelector((state: RootState) => state.cart)
    const { formatCurrency } = useCurrency()

    const [step, setStep] = useState(1);
    const [selectedAddressId, setSelectedAddressId] = useState(
        MOCK_ADDRESSES.find((a) => a.isDefault)?.id ?? MOCK_ADDRESSES[0]?.id ?? ""
    );
    const [selectedDelivery, setSelectedDelivery] = useState(DELIVERY_OPTIONS[1].id); // default standard (free)
    const [selectedPaymentId, setSelectedPaymentId] = useState(
        MOCK_PAYMENT_METHODS[0]?.id ?? ""
    );
    const [promoCode, setPromoCode] = useState("");

    // ── Derive CheckoutItems from Redux cart ──────────────────────────────────
    const items: CheckoutItem[] = cart.items.map((item) => {
        const unitPrice = Number(item.product?.final_price ?? item.product?.price ?? 0) || 0
        return {
            id: item.id,
            name: item.product?.name ?? "Unknown Product",
            variant: item.product?.brand ?? "Tradehut",
            unitPrice,
            quantity: Number(item.quantity) || 1,
            imageUrl: item.product?.main_product_image || item.product?.image || "/placeholder.png",
        }
    })

    // ── Totals — mirrors CartPage logic exactly ───────────────────────────────
    const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)

    const deliveryOption = DELIVERY_OPTIONS.find((d) => d.id === selectedDelivery) ?? DELIVERY_OPTIONS[1]

    // Override free-shipping threshold from cart config; delivery option cost only applies when below threshold
    const deliveryCost = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : deliveryOption.cost

    const tax = subtotal * TAX_RATE
    const total = subtotal + deliveryCost + tax

    const address = MOCK_ADDRESSES.find((a) => a.id === selectedAddressId);
    const paymentMethod = MOCK_PAYMENT_METHODS.find((p) => p.id === selectedPaymentId);

    function handlePlaceOrder() {
        // TODO: POST /api/orders/ with cart items + address + payment
        // TODO: integrate Stripe/Paystack
        alert("Order placed! (Integration pending)");
    }

    function handleApplyPromo() {
        // TODO: validate promo code via /api/promo/validate/
    }

    const summaryNode = (
        <OrderSummary
            items={items}
            subtotal={subtotal}
            deliveryCost={deliveryCost}
            deliveryLabel={deliveryOption.label}
            tax={tax}
            total={total}
            formatCurrency={formatCurrency}
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
                        href="/cart"
                        className="text-sm font-medium text-zinc-400 hover:text-zinc-900 transition-colors min-h-[44px] flex items-center gap-1.5"
                    >
                        <ArrowLeft size={14} /> Return to cart
                    </Link>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-12 pb-32 lg:pb-12">
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
                                formatCurrency={formatCurrency}
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
                                promoCode={promoCode}
                                onPromoChange={setPromoCode}
                                onApplyPromo={handleApplyPromo}
                                onBack={() => setStep(2)}
                                onPlaceOrder={handlePlaceOrder}
                                formatCurrency={formatCurrency}
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
            <MobileSummaryDrawer total={total} formatCurrency={formatCurrency}>
                {summaryNode}
            </MobileSummaryDrawer>
        </div>
        </MainLayout>
    );
}