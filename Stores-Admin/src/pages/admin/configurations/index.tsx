import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';

// Existing modules embedded as deep tabs
import AdminConsole from '../CommonItems/AdminConsole';
import PricingAdmin from '../pricing';
import NotificationsConfig from './tabs/notifications';

// New ecommerce-store config tabs
import StorefrontConfig from './tabs/StorefrontConfig';
import CurrencyTaxConfig from './tabs/CurrencyTaxConfig';
import PaymentsConfig from './tabs/PaymentsConfig';
import ShippingConfig from './tabs/ShippingConfig';
import LocalizationConfig from './tabs/LocalizationConfig';
import CustomersConfig from './tabs/CustomersConfig';
import SystemConfig from './tabs/SystemConfig';

// ─── Tab definitions ────────────────────────────────────────────────────────
interface ConfigTab {
    key: string;
    label: string;
    icon: string;
    section: 'store' | 'commerce' | 'platform';
    description: string;
    component: React.ComponentType;
    badge?: string;
}

const TABS: ConfigTab[] = [
    {
        key: 'storefront',
        label: 'Storefront',
        icon: 'storefront',
        section: 'store',
        description: 'Identity, contact, mode',
        component: StorefrontConfig,
    },
    {
        key: 'currency-tax',
        label: 'Currency & Tax',
        icon: 'savings',
        section: 'store',
        description: 'Base currency, FX, VAT',
        component: CurrencyTaxConfig,
    },
    {
        key: 'localization',
        label: 'Localization',
        icon: 'translate',
        section: 'store',
        description: 'Languages, timezone, units',
        component: LocalizationConfig,
    },
    {
        key: 'catalog',
        label: 'Catalog',
        icon: 'category',
        section: 'commerce',
        description: 'Categories, brands, attributes',
        component: AdminConsole,
    },
    {
        key: 'pricing',
        label: 'Pricing',
        icon: 'price_change',
        section: 'commerce',
        description: 'Rules, factors, surcharges',
        component: PricingAdmin,
    },
    {
        key: 'payments',
        label: 'Payments',
        icon: 'credit_card',
        section: 'commerce',
        description: 'Gateways, payouts, risk',
        component: PaymentsConfig,
    },
    {
        key: 'shipping',
        label: 'Shipping',
        icon: 'local_shipping',
        section: 'commerce',
        description: 'Zones, methods, packaging',
        component: ShippingConfig,
    },
    {
        key: 'customers',
        label: 'Customers',
        icon: 'how_to_reg',
        section: 'commerce',
        description: 'Accounts, checkout, security',
        component: CustomersConfig,
    },
    {
        key: 'notifications',
        label: 'Notifications',
        icon: 'notifications',
        section: 'platform',
        description: 'Email, SMS, push, webhooks',
        component: NotificationsConfig,
    },
    {
        key: 'system',
        label: 'System',
        icon: 'settings',
        section: 'platform',
        description: 'Maintenance, backups, API',
        component: SystemConfig,
    },
];

const SECTION_LABELS: Record<ConfigTab['section'], string> = {
    store: 'Store',
    commerce: 'Commerce',
    platform: 'Platform',
};

// ─── Persisted active tab ───────────────────────────────────────────────────
const TAB_KEY = 'admin:configurations:tab';

// ─── Main component ─────────────────────────────────────────────────────────
const SystemConfigurations: React.FC = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState<string>(() => {
        if (typeof window === 'undefined') return TABS[0].key;
        return localStorage.getItem(TAB_KEY) || TABS[0].key;
    });
    const [search, setSearch] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dispatch(setPageTitle('Store Configurations'));
    }, [dispatch]);

    useEffect(() => {
        if (typeof window !== 'undefined') localStorage.setItem(TAB_KEY, activeTab);
        // Smooth-scroll content area to top on tab switch
        contentRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
    }, [activeTab]);

    const sections = useMemo(() => {
        const filtered = TABS.filter(
            (t) =>
                !search.trim() ||
                t.label.toLowerCase().includes(search.toLowerCase()) ||
                t.description.toLowerCase().includes(search.toLowerCase())
        );
        return (Object.keys(SECTION_LABELS) as ConfigTab['section'][]).map((sec) => ({
            section: sec,
            label: SECTION_LABELS[sec],
            tabs: filtered.filter((t) => t.section === sec),
        }));
    }, [search]);

    const active = TABS.find((t) => t.key === activeTab) ?? TABS[0];
    const ActiveComponent = active.component;

    return (
        <div className="min-h-screen bg-surface">
            <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12">
                {/* ── Page header ───────────────────────────────────────── */}
                <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">
                            Admin · Settings
                        </p>
                        <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mt-1">
                            Store Configurations
                        </h1>
                        <p className="text-sm text-on-surface-variant opacity-80 mt-1 max-w-2xl">
                            Storefront identity, currency, payments, shipping, and platform settings
                            for the marketplace.
                        </p>
                    </div>

                    {/* Quick search across tabs */}
                    <div className="relative md:w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60 text-base pointer-events-none">
                            search
                        </span>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find a setting"
                            className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-container shadow-card"
                        />
                    </div>
                </header>

                {/* ── Mobile: horizontal pill nav ────────────────────────── */}
                <nav
                    className="lg:hidden mb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar"
                    aria-label="Configuration sections (mobile)"
                >
                    <div className="flex gap-2 pb-2 min-w-min">
                        {TABS.map((t) => {
                            const isActive = t.key === activeTab;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setActiveTab(t.key)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                                        isActive
                                            ? 'bg-primary-container text-on-primary shadow-card'
                                            : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low border border-outline-variant/15'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-base">{t.icon}</span>
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <div className="lg:grid lg:grid-cols-[260px,1fr] lg:gap-6">
                    {/* ── Desktop sidebar ───────────────────────────────── */}
                    <aside
                        className="hidden lg:block sticky top-24 self-start"
                        aria-label="Configuration sections"
                    >
                        <div className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
                            {sections.map(({ section, label, tabs }) =>
                                tabs.length === 0 ? null : (
                                    <div key={section}>
                                        <p className="px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">
                                            {label}
                                        </p>
                                        <ul className="px-2 pb-2 space-y-0.5">
                                            {tabs.map((t) => {
                                                const isActive = t.key === activeTab;
                                                return (
                                                    <li key={t.key}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveTab(t.key)}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors active:scale-[0.98] ${
                                                                isActive
                                                                    ? 'bg-primary-container/10 text-primary-container'
                                                                    : 'text-on-surface hover:bg-surface-container-low'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`material-symbols-outlined text-lg ${
                                                                    isActive
                                                                        ? 'text-primary-container'
                                                                        : 'text-on-surface-variant'
                                                                }`}
                                                            >
                                                                {t.icon}
                                                            </span>
                                                            <span className="flex-1 min-w-0">
                                                                <span className="block text-sm font-bold truncate">
                                                                    {t.label}
                                                                </span>
                                                                <span className="block text-[11px] text-on-surface-variant opacity-70 truncate">
                                                                    {t.description}
                                                                </span>
                                                            </span>
                                                            {isActive && (
                                                                <span className="material-symbols-outlined text-base text-primary-container">
                                                                    chevron_right
                                                                </span>
                                                            )}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Help card */}
                        <div className="mt-4 bg-surface-container-low rounded-2xl p-4 border border-outline-variant/10">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-base text-tertiary">
                                    help
                                </span>
                                <p className="text-sm font-bold text-on-surface">Need a hand?</p>
                            </div>
                            <p className="text-xs text-on-surface-variant opacity-80">
                                Each section saves independently. Currency changes propagate everywhere
                                via the global Currency context.
                            </p>
                        </div>
                    </aside>

                    {/* ── Active panel ──────────────────────────────────── */}
                    <div ref={contentRef} className="min-w-0">
                        {/* Section breadcrumb */}
                        <div className="hidden lg:flex items-center gap-2 mb-4 text-xs text-on-surface-variant">
                            <span className="font-bold uppercase tracking-widest opacity-70">
                                {SECTION_LABELS[active.section]}
                            </span>
                            <span className="material-symbols-outlined text-sm opacity-60">
                                chevron_right
                            </span>
                            <span className="font-bold text-on-surface">{active.label}</span>
                        </div>

                        <ActiveComponent />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemConfigurations;
