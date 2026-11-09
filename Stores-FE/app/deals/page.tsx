"use client";

/**
 * Deals and flash sales: /deals
 *
 * Reads the same admin-managed homepage sections as the homepage flash strip
 * (`GET homepage/sections/`, section_type "flash_sale") and renders each live
 * sale with its real products and end time. No local or demo data.
 */

import React, { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, RotateCcw, ShieldCheck, Tag, Zap } from "lucide-react";
import MainLayout from "@/components/Layouts/MainLayout";
import {
  Countdown,
  ProductCardSkeleton,
  ProductGrid,
} from "@/components/common/marketplace";
import { CommerceProductCard } from "@/components/Products/ProductCard";
import type { MarketplaceProduct } from "@/components/common/marketplace";
import { normalizeProducts, type HomeProduct } from "@/components/Home/homeProduct";
import { useHomeSections } from "@/components/Home/useHomeSections";

function toCard(p: HomeProduct, endsAt: string | null): MarketplaceProduct {
  return {
    id: p.id,
    title: p.name,
    href: `/products/${p.id}`,
    imageUrl: p.image || null,
    price: p.price,
    originalPrice: p.originalPrice > p.price ? p.originalPrice : undefined,
    rating: p.rating > 0 ? p.rating : undefined,
    reviewCount: p.reviews > 0 ? p.reviews : undefined,
    soldCount: p.sold ?? undefined,
    stockLeft: p.stock ?? undefined,
    freeShipping: p.freeShipping === true ? true : undefined,
    badge: "Flash deal",
    endsAt: endsAt ?? undefined,
  };
}

const INFO_LINKS = [
  { icon: ShieldCheck, title: "Buyer protection", text: "How we protect your order", href: "/buyer-protection" },
  { icon: RotateCcw, title: "Returns", text: "See the returns process", href: "/returns" },
];

export default function DealsPage() {
  const { sections, loading, error, retry } = useHomeSections();

  const sales = useMemo(
    () =>
      sections
        .filter((s) => s.section_type === "flash_sale")
        .map((s) => ({
          id: s.id,
          title: s.title || "Flash deals",
          subtitle: s.subtitle,
          endsAt: s.show_countdown ? s.ends_at : null,
          cards: normalizeProducts(s.products).map((p) => toCard(p, s.show_countdown ? s.ends_at : null)),
        }))
        .filter((s) => s.cards.length > 0),
    [sections],
  );

  return (
    <MainLayout>
      <main className="bg-gray-50 pb-8 dark:bg-gray-950">
        <section className="bg-gray-900 text-white">
          <div className="container mx-auto flex items-center gap-3 py-3 sm:py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="font-syne text-xl font-extrabold leading-tight sm:text-2xl">Deals</h1>
              <p className="text-xs text-gray-300 sm:text-sm">Limited-time offers. When the timer hits zero the price goes back up.</p>
            </div>
          </div>
        </section>

        <div className="container mx-auto space-y-3 pt-3">
          {loading ? (
            <ProductGrid layout="dense">
              {Array.from({ length: 12 }).map((_, i) => (
                <ProductCardSkeleton key={i} showAddToCart />
              ))}
            </ProductGrid>
          ) : null}

          {!loading && error && sales.length === 0 ? (
            <div role="alert" className="flex flex-col items-center rounded-xl border border-red-200 bg-white px-4 py-8 text-center dark:border-red-900 dark:bg-gray-900">
              <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
              <h2 className="mt-2 font-syne text-lg font-bold text-gray-900 dark:text-gray-100">Could not load deals</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Check your connection and try again.</p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : null}

          {!loading && !error && sales.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center dark:border-gray-700 dark:bg-gray-900">
              <Tag className="h-8 w-8 text-gray-400" aria-hidden="true" />
              <h2 className="mt-2 font-syne text-lg font-bold text-gray-900 dark:text-gray-100">No deals running right now</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Check back soon, or browse everything we have in stock.</p>
              <Link
                href="/products"
                className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Browse products
              </Link>
            </div>
          ) : null}

          {sales.map((sale) => (
            <section key={sale.id} aria-label={sale.title}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <h2 className="truncate font-syne text-lg font-bold text-gray-900 dark:text-gray-100">{sale.title}</h2>
                  {sale.subtitle ? (
                    <p className="line-clamp-1 text-xs text-gray-600 dark:text-gray-400">{sale.subtitle}</p>
                  ) : null}
                </div>
                {sale.endsAt ? (
                  <Countdown endsAt={sale.endsAt} variant="inline" label="Ends in" onEnd={retry} />
                ) : null}
              </div>
              <ProductGrid layout="dense">
                {sale.cards.map((card, i) => (
                  <CommerceProductCard key={card.id} product={card} priority={i < 4} showAddToCart />
                ))}
              </ProductGrid>
            </section>
          ))}
        </div>

        <section aria-label="Buyer information" className="container mx-auto mt-4">
          <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {INFO_LINKS.map(({ icon: Icon, title, text, href }) => (
              <li key={title}>
                <Link
                  href={href}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-gray-700 dark:bg-gray-900"
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">{title}</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">{text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </MainLayout>
  );
}
